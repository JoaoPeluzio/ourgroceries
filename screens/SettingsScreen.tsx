import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Share, Platform } from 'react-native';
import { Moon, Sun, Cloud, User, Key, Database, ChevronRight, HelpCircle, CheckCircle } from 'lucide-react-native';
import { useShoppingStore } from '../store/useShoppingStore';
import { useTheme } from '../hooks/useTheme';
import { VibeText } from '../components/ui/Text';
import { VibeCard } from '../components/ui/Card';
import { VibeInput } from '../components/ui/Input';
import { VibeButton } from '../components/ui/Button';
import { resetSupabaseClient, getSupabase, initializeRealtimeSync } from '../services/supabase';
import { Haptics } from '../services/haptics';

export const SettingsScreen: React.FC = () => {
  const { colors, theme, toggleTheme } = useTheme();
  
  const settings = useShoppingStore((state) => state.settings);
  const updateSettings = useShoppingStore((state) => state.updateSettings);
  const profile = useShoppingStore((state) => state.profile);
  const sessionUser = useShoppingStore((state) => state.sessionUser);
  const signOut = useShoppingStore((state) => state.signOut);

  const isSuperAdmin = 
    profile?.isSuperuser === true || 
    sessionUser?.email === 'jvpeluzio@gmail.com';

  // Local state for forms
  const [userName, setUserName] = useState(settings.userName);
  const [partnerName, setPartnerName] = useState(settings.partnerName);
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey);
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const handleSaveProfile = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({
      userName: userName.trim() || 'Husband',
      partnerName: partnerName.trim() || 'Wife',
    });
    Alert.alert('Profile Saved', 'Profile settings updated successfully.');
  };

  const handleShareInviteCode = async () => {
    if (!profile?.householdId) {
      Alert.alert('No Code Available', 'You are not linked to a household yet.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await Share.share({
        message: `Hey! Join my household on VibeCart so we can share grocery lists. Use this Invite Code: ${profile.householdId}`,
        title: 'VibeCart Join Invite',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not open share menu.');
    }
  };

  const handleSaveCloudSettings = async () => {
    setTestResult('testing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 1. Temporarily write credentials locally and clear cached instance
    let cleanedUrl = supabaseUrl.trim();
    if (cleanedUrl.includes('.supabase.com')) {
      cleanedUrl = cleanedUrl.replace('.supabase.com', '.supabase.co');
    }
    updateSettings({
      supabaseUrl: cleanedUrl,
      supabaseAnonKey: supabaseAnonKey.trim(),
    });
    resetSupabaseClient();

    // 2. Validate client creation and try connection
    const client = getSupabase();
    if (!client) {
      setTestResult('failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Configuration Error', 'Invalid Supabase URL or Anon Key. Please check the values.');
      updateSettings({ isSyncEnabled: false });
      return;
    }

    try {
      // Test select query on shopping_lists table to check connectivity
      const { error } = await client.from('shopping_lists').select('id').limit(1);
      
      if (error) {
        throw error;
      }

      // 3. Enable sync and initialize channels
      setTestResult('success');
      updateSettings({ isSyncEnabled: true });
      initializeRealtimeSync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Connected to Supabase! Real-time sync is now active.');
    } catch (e: any) {
      setTestResult('failed');
      updateSettings({ isSyncEnabled: false });
      resetSupabaseClient();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Connection Failed', `Could not reach database: ${e.message || e}`);
    }
  };

  const handleToggleSync = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (value && (!supabaseUrl || !supabaseAnonKey)) {
      Alert.alert('Setup Required', 'Please configure your Supabase URL and Anon Key before enabling sync.');
      return;
    }

    updateSettings({ isSyncEnabled: value });
    resetSupabaseClient();

    if (value) {
      initializeRealtimeSync();
    }
  };

  const handleSaveGeminiKey = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({ geminiApiKey: geminiApiKey.trim() });
    Alert.alert('AI Key Saved', 'Gemini API key updated successfully.');
  };

  // SQL Script for user reference
  const sqlSchema = `
-- Create Shopping Lists Table
CREATE TABLE public.shopping_lists (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  icon TEXT
);

-- Create Shopping Items Table
CREATE TABLE public.shopping_items (
  id UUID PRIMARY KEY,
  list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT,
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

-- Enable Row Level Security (or disable for simple shared couples setups)
ALTER TABLE public.shopping_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items DISABLE ROW LEVEL SECURITY;
`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <VibeText variant="bold" size="xl" style={styles.screenTitle}>
        Settings
      </VibeText>

      {/* 1. Theme Setting Card */}
      <VibeCard style={styles.settingCard}>
        <View style={styles.rowItemHeader}>
          <View style={styles.iconTitleRow}>
            {theme === 'dark' ? (
              <Moon size={20} color={colors.primaryLight} />
            ) : (
              <Sun size={20} color={colors.primary} />
            )}
            <VibeText variant="semibold" style={{ marginLeft: 10 }}>
              Theme Selection
            </VibeText>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={(val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleTheme();
            }}
            trackColor={{ false: colors.cardSecondary, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
        <VibeText size="xs" color="textMuted" style={styles.cardInfo}>
          Active layout: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </VibeText>
      </VibeCard>

      {/* 2. Couple Profiles */}
      <VibeCard style={styles.settingCard}>
        <View style={styles.sectionTitleRow}>
          <User size={18} color={colors.primary} />
          <VibeText variant="bold" style={styles.sectionTitle}>
            PROFILE CONFIG
          </VibeText>
        </View>

        <VibeText size="sm" style={styles.label}>
          Your Name (e.g., Husband)
        </VibeText>
        <VibeInput
          placeholder="Enter your name"
          value={userName}
          onChangeText={setUserName}
          onClear={() => setUserName('')}
          containerStyle={styles.inputMargin}
        />

        <VibeText size="sm" style={styles.label}>
          Partner Name (e.g., Wife)
        </VibeText>
        <VibeInput
          placeholder="Enter partner's name"
          value={partnerName}
          onChangeText={setPartnerName}
          onClear={() => setPartnerName('')}
          containerStyle={styles.inputMargin}
        />

        <VibeButton title="Save Profile Settings" variant="secondary" onPress={handleSaveProfile} style={styles.saveBtn} />

        {/* Household Invite Code Display */}
        {profile?.householdId && (
          <View style={[styles.inviteCodeContainer, { borderColor: colors.border, backgroundColor: colors.cardSecondary }]}>
            <VibeText size="xs" color="textMuted" variant="semibold" style={{ letterSpacing: 0.5 }}>
              HOUSEHOLD INVITE CODE
            </VibeText>
            <VibeText variant="bold" style={[styles.inviteCodeText, { color: colors.primary }]}>
              {profile.householdId}
            </VibeText>
            <VibeText size="xs" color="textMuted" style={{ textAlign: 'center', marginBottom: 12, lineHeight: 16 }}>
              Share this code with your partner so they can join your household during sign-up.
            </VibeText>
            <VibeButton
              title="Share Invite Code"
              variant="outline"
              size="sm"
              onPress={handleShareInviteCode}
              style={{ width: '100%', borderColor: colors.primary }}
            />
          </View>
        )}
      </VibeCard>

      {/* 3. Supabase Real-time Sync */}
      {isSuperAdmin && (
        <VibeCard style={styles.settingCard}>
          <View style={styles.sectionTitleRow}>
            <Database size={18} color={colors.primary} />
            <VibeText variant="bold" style={styles.sectionTitle}>
              SUPABASE SYNC SETUP
            </VibeText>
          </View>

          <View style={styles.rowItemHeader}>
            <VibeText size="sm" variant="semibold">
              Enable Cloud Syncing
            </VibeText>
            <Switch
              value={settings.isSyncEnabled}
              onValueChange={handleToggleSync}
              trackColor={{ false: colors.cardSecondary, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <VibeText size="xs" color="textMuted" style={styles.cardInfo}>
            Sync status: {settings.isSyncEnabled ? 'CONNECTED' : 'LOCAL ONLY'}
          </VibeText>

          <VibeText size="sm" style={styles.label}>
            Supabase Project URL
          </VibeText>
          <VibeInput
            placeholder="https://xxxxxx.supabase.co"
            value={supabaseUrl}
            onChangeText={setSupabaseUrl}
            onClear={() => setSupabaseUrl('')}
            containerStyle={styles.inputMargin}
            autoCapitalize="none"
            keyboardType="url"
          />

          <VibeText size="sm" style={styles.label}>
            Supabase Anon API Key
          </VibeText>
          <VibeInput
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={supabaseAnonKey}
            onChangeText={setSupabaseAnonKey}
            onClear={() => setSupabaseAnonKey('')}
            containerStyle={styles.inputMargin}
            autoCapitalize="none"
            secureTextEntry
          />

          <VibeButton
            title={testResult === 'testing' ? 'Connecting...' : 'Test & Save Database'}
            variant="primary"
            onPress={handleSaveCloudSettings}
            loading={testResult === 'testing'}
            style={styles.saveBtn}
          />

          {/* Database setup SQL toggle */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSqlGuide(!showSqlGuide);
            }}
            style={styles.sqlGuideToggle}
          >
            <HelpCircle size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <VibeText color="primary" variant="semibold" size="sm">
              {showSqlGuide ? 'Hide Setup SQL Script' : 'Show Setup SQL Script'}
            </VibeText>
          </TouchableOpacity>

          {showSqlGuide && (
            <View style={[styles.sqlBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <VibeText size="xs" color="textMuted" style={styles.sqlHeader}>
                Run this script in your Supabase SQL Editor:
              </VibeText>
              <ScrollView horizontal style={styles.sqlScroll}>
                <VibeText size="xs" style={styles.sqlText}>
                  {sqlSchema}
                </VibeText>
              </ScrollView>
            </View>
          )}
        </VibeCard>
      )}

      {/* 4. Gemini AI Parser */}
      {isSuperAdmin && (
        <VibeCard style={styles.settingCard}>
          <View style={styles.sectionTitleRow}>
            <Key size={18} color={colors.primary} />
            <VibeText variant="bold" style={styles.sectionTitle}>
              GEMINI AI PARSER CONFIG
            </VibeText>
          </View>

          <VibeText size="xs" color="textMuted" style={styles.cardInfo}>
            Add a Gemini API key to enable recipe ingredient expansions (e.g. typing "ingredients for pancakes") and smart category sorting.
          </VibeText>

          <VibeText size="sm" style={styles.label}>
            Gemini API Key
          </VibeText>
          <VibeInput
            placeholder="AIzaSy..."
            value={geminiApiKey}
            onChangeText={setGeminiApiKey}
            onClear={() => setGeminiApiKey('')}
            containerStyle={styles.inputMargin}
            autoCapitalize="none"
            secureTextEntry
          />

          <VibeButton title="Save AI Settings" variant="secondary" onPress={handleSaveGeminiKey} style={styles.saveBtn} />
        </VibeCard>
      )}

      {/* 5. Account Sign Out Card */}
      <VibeCard style={styles.settingCard}>
        <View style={styles.sectionTitleRow}>
          <User size={18} color={colors.error} />
          <VibeText variant="bold" style={[styles.sectionTitle, { color: colors.error }]}>
            ACCOUNT
          </VibeText>
        </View>
        <VibeText size="xs" color="textMuted" style={styles.cardInfo}>
          Signed in as: <VibeText variant="bold" size="xs" style={{ color: colors.text }}>{sessionUser?.email}</VibeText>
        </VibeText>
        <VibeButton
          title="Sign Out"
          variant="outline"
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out of VibeCart?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: () => signOut(),
                },
              ]
            );
          }}
          style={{ marginTop: 12, borderColor: colors.error }}
        />
      </VibeCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  screenTitle: {
    marginBottom: 16,
  },
  settingCard: {
    marginBottom: 16,
    paddingVertical: 18,
  },
  rowItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    marginTop: 6,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 6,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 12,
    letterSpacing: 1,
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
  },
  inputMargin: {
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 12,
  },
  inviteCodeContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  inviteCodeText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  sqlGuideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  sqlBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  sqlHeader: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sqlScroll: {
    maxHeight: 180,
  },
  sqlText: {
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
