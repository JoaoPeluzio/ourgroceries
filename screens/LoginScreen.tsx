import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Mail, Lock, User as UserIcon, Users, LogIn, Globe } from 'lucide-react-native';
import { useShoppingStore } from '../store/useShoppingStore';
import { useTheme } from '../hooks/useTheme';
import { VibeText } from '../components/ui/Text';
import { VibeInput } from '../components/ui/Input';
import { VibeButton } from '../components/ui/Button';
import { VibeCard } from '../components/ui/Card';
import { supabase, getSupabase } from '../services/supabase';
import * as Haptics from 'expo-haptics';
import { registerForPushNotifications } from '../services/notifications';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

export const LoginScreen: React.FC = () => {
  const { colors } = useTheme();
  
  const sessionUser = useShoppingStore((state) => state.sessionUser);
  const profile = useShoppingStore((state) => state.profile);
  const setSessionUser = useShoppingStore((state) => state.setSessionUser);
  const setProfile = useShoppingStore((state) => state.setProfile);
  const updateSettings = useShoppingStore((state) => state.updateSettings);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'husband' | 'wife' | 'member'>('husband');
  const [householdMode, setHouseholdMode] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [householdCode, setHouseholdCode] = useState('');

  // Pre-fill name from Google Metadata if available
  useEffect(() => {
    if (sessionUser && !profile && !name) {
      const googleName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || '';
      if (googleName) {
        setName(googleName);
      }
    }
  }, [sessionUser, profile]);

  const handleAuth = async () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      Alert.alert('Validation Error', 'Email and password are required.');
      return;
    }

    if (!isLogin && !name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }

    if (!isLogin && householdMode === 'create' && !householdName.trim()) {
      Alert.alert('Validation Error', 'Please enter a household name.');
      return;
    }

    if (!isLogin && householdMode === 'join' && !householdCode.trim()) {
      Alert.alert('Validation Error', 'Please enter a household invite code.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) throw error;

        if (data.user) {
          // Fetch profile row from public.profiles
          const { data: profileRow, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profileRow) {
            // Rollback auth if profile doesn't exist
            await supabase.auth.signOut();
            throw new Error('Profile not found in database.');
          }

          // Register push token
          await registerForPushNotifications(profileRow.id, profileRow.household_id, profileRow.role);

          // Update local settings role to align cart views
          updateSettings({
            currentUserRole: profileRow.role,
            userName: profileRow.name || (profileRow.role === 'husband' ? 'Husband' : 'Wife'),
            partnerName: profileRow.role === 'husband' ? 'Wife' : 'Husband',
          });

          setSessionUser(data.user);
          setProfile({
            id: profileRow.id,
            householdId: profileRow.household_id,
            role: profileRow.role,
            name: profileRow.name,
            avatarUrl: profileRow.avatar_url,
            isSuperuser: profileRow.is_superuser,
          });
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // --- SIGN UP FLOW ---
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error('Account creation failed.');

        // If no session returned, the email likely already exists (e.g. from Google Sign-In)
        // or email confirmation is required. Supabase returns a fake user ID in this case.
        if (!signUpData.session) {
          throw new Error(
            'Could not complete registration. This email may already be registered (possibly via Google Sign-In). Please try signing in with your existing method instead.'
          );
        }

        const user = signUpData.user;
        const isSuper = cleanEmail.toLowerCase() === 'jvpeluzio@gmail.com';

        // Use server-side RPC to create household + profile atomically (bypasses RLS)
        const { data: regData, error: regError } = await supabase.rpc('register_user', {
          p_user_id: user.id,
          p_name: name.trim(),
          p_role: role,
          p_household_name: householdMode === 'create' ? householdName.trim() : null,
          p_household_id: householdMode === 'join' ? householdCode.trim() : null,
          p_is_superuser: isSuper,
        });

        if (regError) throw new Error(`Registration failed: ${regError.message}`);

        const finalHouseholdId = regData.household_id;

        // Register push token
        await registerForPushNotifications(user.id, finalHouseholdId, role);

        // Update local settings role to align cart views
        updateSettings({
          currentUserRole: role,
          userName: name.trim(),
          partnerName: role === 'husband' ? 'Wife' : 'Husband',
        });

        setSessionUser(user);
        setProfile({
          id: user.id,
          householdId: finalHouseholdId,
          role: role,
          name: name.trim(),
          isSuperuser: isSuper,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Account Created', `Successfully registered! Join Code: ${finalHouseholdId}`);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Authentication Error', e.message || 'Something went wrong.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Sign out any existing session first to avoid conflicts
      await supabase.auth.signOut();

      // Generate redirect URL dynamically depending on environment
      let redirectUrl = Linking.createURL('google-auth');
      if (__DEV__ && Constants.expoConfig?.hostUri) {
        redirectUrl = `exp://${Constants.expoConfig.hostUri}/--/google-auth`;
      }

      console.log('=== GOOGLE SIGN-IN ===');
      console.log('Redirect URL:', redirectUrl);
      
      // Verify Supabase client is initialized
      const client = getSupabase();
      
      if (!client) {
        throw new Error('Supabase is not configured. Please check your settings (URL and Anon Key).');
      }

      // Get OAuth URL from Supabase
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (!data?.url) {
        throw new Error('Google OAuth did not return an authorization URL. Please verify that Google provider is enabled in your Supabase Dashboard.');
      }

      console.log('Opening system browser for Google Sign-In...');
      
      // Open in the REAL system Safari (not sandboxed ASWebAuthenticationSession)
      // The deep link handler in App.tsx will catch the callback automatically
      await Linking.openURL(data.url);
      
      // Loading will be reset when the app regains focus or the deep link fires
      // Set a timeout to reset loading state in case user cancels
      setTimeout(() => setLoading(false), 30000);
      
    } catch (e: any) {
      console.error(e);
      Alert.alert('Google Sign-In Failed', e.message || 'Could not complete authentication.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!sessionUser) return;
    
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }

    if (householdMode === 'create' && !householdName.trim()) {
      Alert.alert('Validation Error', 'Please enter a household name.');
      return;
    }

    if (householdMode === 'join' && !householdCode.trim()) {
      Alert.alert('Validation Error', 'Please enter a household invite code.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const isSuper = sessionUser.email?.toLowerCase() === 'jvpeluzio@gmail.com';

      // Use server-side RPC to create household + profile atomically (bypasses RLS)
      const { data: regData, error: regError } = await supabase.rpc('register_user', {
        p_user_id: sessionUser.id,
        p_name: cleanName,
        p_role: role,
        p_household_name: householdMode === 'create' ? householdName.trim() : null,
        p_household_id: householdMode === 'join' ? householdCode.trim() : null,
        p_avatar_url: sessionUser.user_metadata?.avatar_url || null,
        p_is_superuser: isSuper,
      });

      if (regError) throw new Error(`Registration failed: ${regError.message}`);

      const finalHouseholdId = regData.household_id;

      // Register push token
      await registerForPushNotifications(sessionUser.id, finalHouseholdId, role);

      // Update store settings & profile
      updateSettings({
        currentUserRole: role,
        userName: cleanName,
        partnerName: role === 'husband' ? 'Wife' : 'Husband',
      });

      setProfile({
        id: sessionUser.id,
        householdId: finalHouseholdId,
        role: role,
        name: cleanName,
        avatarUrl: sessionUser.user_metadata?.avatar_url || undefined,
        isSuperuser: isSuper,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Setup Complete', `Welcome to VibeCart! Join Code: ${finalHouseholdId}`);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Registration Failed', e.message || 'Something went wrong.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* Visual Logo Brand Header */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoCircle, { backgroundColor: colors.cardSecondary }]}>
            <Users size={36} color={colors.primary} />
          </View>
          <VibeText variant="bold" size="lg" style={styles.brandTitle}>
            VibeCart
          </VibeText>
          <VibeText size="sm" color="textMuted">
            Cooperative shared grocery lists for couples
          </VibeText>
        </View>

        {sessionUser && !profile ? (
          /* Profile Onboarding Card Container */
          <VibeCard style={styles.authCard}>
            <VibeText variant="bold" size="md" style={styles.cardTitle}>
              Complete Your Profile
            </VibeText>
            
            <VibeText size="xs" color="textMuted" style={{ textAlign: 'center', marginBottom: 20, lineHeight: 16 }}>
              We detected a Google account ({sessionUser.email}). Please choose your role and household to continue.
            </VibeText>

            <VibeInput
              placeholder="Your Full Name"
              value={name}
              onChangeText={setName}
              leftIcon={<UserIcon size={18} color={colors.textMuted} />}
            />
            
            {/* Role Selection Picker */}
            <View style={styles.roleSelectionRow}>
              <VibeText variant="semibold" size="xs" color="textMuted" style={styles.roleLabel}>
                YOUR ROLE:
              </VibeText>
              
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRole('husband');
                }}
                style={[
                  styles.roleTab,
                  { borderColor: colors.border },
                  role === 'husband' && { backgroundColor: '#820AD1', borderColor: '#820AD1' },
                ]}
              >
                <VibeText variant="bold" style={[styles.roleText, role === 'husband' && { color: '#FFFFFF' }]}>
                  Husband
                </VibeText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRole('wife');
                }}
                style={[
                  styles.roleTab,
                  { borderColor: colors.border },
                  role === 'wife' && { backgroundColor: '#FF6B8B', borderColor: '#FF6B8B' },
                ]}
              >
                <VibeText variant="bold" style={[styles.roleText, role === 'wife' && { color: '#FFFFFF' }]}>
                  Wife
                </VibeText>
              </TouchableOpacity>
            </View>
            
            {/* Household Configuration Row */}
            <View style={styles.householdToggleRow}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHouseholdMode('create');
                }}
                style={[styles.toggleBtn, householdMode === 'create' && styles.activeToggle]}
              >
                <VibeText variant="semibold" size="xs" style={{ color: householdMode === 'create' ? colors.primary : colors.textMuted }}>
                  Create Household
                </VibeText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHouseholdMode('join');
                }}
                style={[styles.toggleBtn, householdMode === 'join' && styles.activeToggle]}
              >
                <VibeText variant="semibold" size="xs" style={{ color: householdMode === 'join' ? colors.primary : colors.textMuted }}>
                  Join Existing
                </VibeText>
              </TouchableOpacity>
            </View>

            {householdMode === 'create' ? (
              <VibeInput
                placeholder="Household Name (e.g. Our Home)"
                value={householdName}
                onChangeText={setHouseholdName}
                leftIcon={<Users size={18} color={colors.textMuted} />}
              />
            ) : (
              <VibeInput
                placeholder="Enter Join Code (Household ID)"
                value={householdCode}
                onChangeText={setHouseholdCode}
                leftIcon={<Lock size={18} color={colors.textMuted} />}
              />
            )}

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 14 }} />
            ) : (
              <VibeButton
                title="Complete Registration"
                variant="primary"
                icon={<LogIn size={18} color="#FFFFFF" />}
                onPress={handleCompleteOnboarding}
                style={styles.submitBtn}
              />
            )}
          </VibeCard>
        ) : (
          /* Normal Sign In / Create Account Card */
          <VibeCard style={styles.authCard}>
            <VibeText variant="bold" size="md" style={styles.cardTitle}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </VibeText>

            {/* Registration Extra Fields */}
            {!isLogin && (
              <>
                <VibeInput
                  placeholder="Full Name"
                  value={name}
                  onChangeText={setName}
                  leftIcon={<UserIcon size={18} color={colors.textMuted} />}
                />
                
                {/* Role Selection Picker */}
                <View style={styles.roleSelectionRow}>
                  <VibeText variant="semibold" size="xs" color="textMuted" style={styles.roleLabel}>
                    YOUR ROLE:
                  </VibeText>
                  
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRole('husband');
                    }}
                    style={[
                      styles.roleTab,
                      { borderColor: colors.border },
                      role === 'husband' && { backgroundColor: '#820AD1', borderColor: '#820AD1' },
                    ]}
                  >
                    <VibeText variant="bold" style={[styles.roleText, role === 'husband' && { color: '#FFFFFF' }]}>
                      Husband
                    </VibeText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRole('wife');
                    }}
                    style={[
                      styles.roleTab,
                      { borderColor: colors.border },
                      role === 'wife' && { backgroundColor: '#FF6B8B', borderColor: '#FF6B8B' },
                    ]}
                  >
                    <VibeText variant="bold" style={[styles.roleText, role === 'wife' && { color: '#FFFFFF' }]}>
                      Wife
                    </VibeText>
                  </TouchableOpacity>
                </View>
                
                {/* Household Configuration Row */}
                <View style={styles.householdToggleRow}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setHouseholdMode('create');
                    }}
                    style={[styles.toggleBtn, householdMode === 'create' && styles.activeToggle]}
                  >
                    <VibeText variant="semibold" size="xs" style={{ color: householdMode === 'create' ? colors.primary : colors.textMuted }}>
                      Create Household
                    </VibeText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setHouseholdMode('join');
                    }}
                    style={[styles.toggleBtn, householdMode === 'join' && styles.activeToggle]}
                  >
                    <VibeText variant="semibold" size="xs" style={{ color: householdMode === 'join' ? colors.primary : colors.textMuted }}>
                      Join Existing
                    </VibeText>
                  </TouchableOpacity>
                </View>

                {householdMode === 'create' ? (
                  <VibeInput
                    placeholder="Household Name (e.g. Our Home)"
                    value={householdName}
                    onChangeText={setHouseholdName}
                    leftIcon={<Users size={18} color={colors.textMuted} />}
                  />
                ) : (
                  <VibeInput
                    placeholder="Enter Join Code (Household ID)"
                    value={householdCode}
                    onChangeText={setHouseholdCode}
                    leftIcon={<Lock size={18} color={colors.textMuted} />}
                  />
                )}
              </>
            )}

            {/* Email / Password */}
            <VibeInput
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Mail size={18} color={colors.textMuted} />}
            />

            <VibeInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              leftIcon={<Lock size={18} color={colors.textMuted} />}
            />

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 14 }} />
            ) : (
              <>
                <VibeButton
                  title={isLogin ? 'Log In' : 'Sign Up'}
                  variant="primary"
                  icon={<LogIn size={18} color="#FFFFFF" />}
                  onPress={handleAuth}
                  style={styles.submitBtn}
                />

                {/* OR Divider */}
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <VibeText size="xs" color="textMuted" style={styles.dividerText}>OR</VibeText>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                {/* Google Button */}
                <VibeButton
                  title="Sign in with Google"
                  variant="outline"
                  icon={<Globe size={18} color={colors.primary} />}
                  onPress={handleGoogleSignIn}
                  style={styles.googleBtn}
                />
              </>
            )}

            {/* Switch Mode Footer */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsLogin(!isLogin);
              }}
              style={styles.switchModeContainer}
            >
              <VibeText size="xs" color="textMuted">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <VibeText size="xs" color="primary" variant="bold">
                  {isLogin ? 'Create one' : 'Sign In'}
                </VibeText>
              </VibeText>
            </TouchableOpacity>
          </VibeCard>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    marginBottom: 4,
  },
  authCard: {
    padding: 24,
    borderRadius: 24,
  },
  cardTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  submitBtn: {
    marginTop: 8,
  },
  switchModeContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  roleSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  roleLabel: {
    marginRight: 10,
    flex: 0.8,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  roleText: {
    fontSize: 12,
  },
  householdToggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 16,
    paddingBottom: 4,
  },
  toggleBtn: {
    marginRight: 16,
    paddingVertical: 6,
  },
  activeToggle: {
    borderBottomWidth: 2,
    borderBottomColor: '#820AD1',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontWeight: 'bold',
  },
  googleBtn: {
    marginTop: 0,
  },
});
