import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { ShoppingCart, Archive, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { useTheme } from './hooks/useTheme';
import { useShoppingStore } from './store/useShoppingStore';
import { initializeRealtimeSync, supabase } from './services/supabase';
import { VibeText } from './components/ui/Text';

// Screens
import { ListsScreen } from './screens/ListsScreen';
import { ArchiveScreen } from './screens/ArchiveScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { AppPreloader } from './components/AppPreloader';

WebBrowser.maybeCompleteAuthSession();

function MainAppLayout() {
  const { colors, theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'lists' | 'archive' | 'settings'>('lists');
  const settings = useShoppingStore((state) => state.settings);
  const sessionUser = useShoppingStore((state) => state.sessionUser);
  const profile = useShoppingStore((state) => state.profile);
  const updateSettings = useShoppingStore((state) => state.updateSettings);
  const setSessionUser = useShoppingStore((state) => state.setSessionUser);
  const setProfile = useShoppingStore((state) => state.setProfile);
  const signOut = useShoppingStore((state) => state.signOut);
  const isSyncEnabled = settings.isSyncEnabled;

  // Validate session profile against database to detect deleted/stale accounts
  useEffect(() => {
    const validateProfile = async () => {
      if (sessionUser && supabase) {
        try {
          const { data: profileRow, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', sessionUser.id)
            .single();

          if (error) {
            // PGRST116 indicates the row is missing (no rows returned)
            if (error.code === 'PGRST116') {
              console.warn('Profile row missing in database (PGRST116). Signing out stale session...');
              await signOut();
            }
          } else if (!profileRow) {
            console.warn('Profile row missing in database. Signing out stale session...');
            await signOut();
          }
        } catch (e) {
          console.error('Failed to validate profile session:', e);
        }
      }
    };
    validateProfile();
  }, [sessionUser]);

  // Hydrate configurations from environment variables if not already set
  useEffect(() => {
    if (
      !settings.supabaseUrl || 
      settings.supabaseUrl === 'https://ofytudseazicitwxakkg.supabase.co' || 
      !settings.geminiApiKey || 
      settings.geminiApiKey === 'YOUR_GEMINI_API_KEY_HERE'
    ) {
      updateSettings({
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
        isSyncEnabled: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      });
    }
  }, [settings.supabaseUrl, settings.geminiApiKey]);

  // Parse custom parameters from deep link hashes
  const parseAuthParams = (url: string) => {
    const parts = url.split(/#|\?/);
    if (parts.length < 2) return {};
    const queryString = parts[1];
    const params: Record<string, string> = {};
    queryString.split('&').forEach((pair) => {
      const [key, val] = pair.split('=');
      if (key && val) {
        params[decodeURIComponent(key)] = decodeURIComponent(val);
      }
    });
    return params;
  };

  // Deep linking OAuth handler
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const params = parseAuthParams(event.url);
      const { access_token, refresh_token } = params;

      if (access_token && refresh_token) {
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) throw sessionError;

          if (sessionData.user) {
            // Fetch profile row
            const { data: profileRow, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionData.user.id)
              .single();

            setSessionUser(sessionData.user);

            if (profileRow && !profileError) {
              setProfile({
                id: profileRow.id,
                householdId: profileRow.household_id,
                role: profileRow.role,
                name: profileRow.name,
                avatarUrl: profileRow.avatar_url,
                isSuperuser: profileRow.is_superuser,
              });

              updateSettings({
                currentUserRole: profileRow.role,
                userName: profileRow.name || (profileRow.role === 'husband' ? 'Husband' : 'Wife'),
                partnerName: profileRow.role === 'husband' ? 'Wife' : 'Husband',
              });
            } else {
              // New user from Google Sign-In, profile needs configuration
              setProfile(null);
            }
          }
        } catch (err) {
          console.error('Error handling deep link auth redirection:', err);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Initialize Real-time synchronization when sync is active and auth profile is ready
  useEffect(() => {
    if (isSyncEnabled && sessionUser && profile?.householdId) {
      const unsubscribe = initializeRealtimeSync();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isSyncEnabled, sessionUser, profile?.householdId]);

  const handleTabChange = (tab: 'lists' | 'archive' | 'settings') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'archive':
        return <ArchiveScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'lists':
      default:
        return <ListsScreen />;
    }
  };

  if (!sessionUser || !profile) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Dynamic Content Screen Wrapper */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Modern Tab Bar */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            height: insets.bottom > 0 ? 60 + insets.bottom : 68,
          },
        ]}
      >
        {/* Lists Tab */}
        <TouchableOpacity
          onPress={() => handleTabChange('lists')}
          activeOpacity={0.8}
          style={styles.tabItem}
        >
          <ShoppingCart
            size={22}
            color={activeTab === 'lists' ? colors.primary : colors.textMuted}
            strokeWidth={activeTab === 'lists' ? 2.5 : 1.8}
          />
          <VibeText
            variant={activeTab === 'lists' ? 'bold' : 'regular'}
            size="xs"
            style={[
              styles.tabLabel,
              { color: activeTab === 'lists' ? colors.primary : colors.textMuted },
            ]}
          >
            Lists
          </VibeText>
        </TouchableOpacity>



        {/* Archive / History Tab */}
        <TouchableOpacity
          onPress={() => handleTabChange('archive')}
          activeOpacity={0.8}
          style={styles.tabItem}
        >
          <Archive
            size={22}
            color={activeTab === 'archive' ? colors.primary : colors.textMuted}
            strokeWidth={activeTab === 'archive' ? 2.5 : 1.8}
          />
          <VibeText
            variant={activeTab === 'archive' ? 'bold' : 'regular'}
            size="xs"
            style={[
              styles.tabLabel,
              { color: activeTab === 'archive' ? colors.primary : colors.textMuted },
            ]}
          >
            Archive
          </VibeText>
        </TouchableOpacity>

        {/* Settings Tab */}
        <TouchableOpacity
          onPress={() => handleTabChange('settings')}
          activeOpacity={0.8}
          style={styles.tabItem}
        >
          <Settings
            size={22}
            color={activeTab === 'settings' ? colors.primary : colors.textMuted}
            strokeWidth={activeTab === 'settings' ? 2.5 : 1.8}
          />
          <VibeText
            variant={activeTab === 'settings' ? 'bold' : 'regular'}
            size="xs"
            style={[
              styles.tabLabel,
              { color: activeTab === 'settings' ? colors.primary : colors.textMuted },
            ]}
          >
            Settings
          </VibeText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumTimeElapsed(true);
    }, 1800); // 1.8 seconds minimum splash screen
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded || !minimumTimeElapsed) {
    return <AppPreloader />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MainAppLayout />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
