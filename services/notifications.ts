import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure notification behavior
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Register current device token to Supabase user_push_tokens table
 */
export async function registerForPushNotifications(
  userId?: string,
  householdId?: string,
  role?: 'husband' | 'wife' | 'member'
) {
  if (Platform.OS === 'web') return;

  if (!userId || !householdId || !role) {
    console.warn('Skipping push token registration: Profile IDs or role not provided.');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Push notification permissions denied.');
      return;
    }

    // Retrieve Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('EAS Project ID not found in app.json. Remote push notifications are disabled for this build.');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;

    if (token) {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          id: userId,
          household_id: householdId,
          role,
          token,
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('Error saving push token to Supabase:', error.message);
      } else {
        console.log(`Successfully registered push token for role: ${role}`);
      }
    }
  } catch (error) {
    console.warn('Error setting up push notifications:', error);
  }
}

/**
 * Send a notification to the partner device
 */
export async function notifyPartner(partnerRole: 'husband' | 'wife' | 'member', message: string) {
  try {
    const useShoppingStore = require('../store/useShoppingStore').useShoppingStore;
    const store = useShoppingStore.getState();
    const profile = store.profile;

    if (!profile || !profile.householdId) return;

    // 1. Fetch partner's push token from Supabase within the same household
    const { data, error } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('household_id', profile.householdId)
      .eq('role', partnerRole)
      .limit(1);

    if (error) {
      console.warn('Could not find partner push token:', error.message);
      return;
    }

    if (data && data.length > 0 && data[0].token) {
      // 2. HTTP POST call directly to Expo's Push API
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept-encoding': 'gzip, deflate',
        },
        body: JSON.stringify({
          to: data.token,
          title: 'VibeCart Update 🛒',
          body: message,
          sound: 'default',
          priority: 'high',
        }),
      });

      if (!response.ok) {
        console.warn('Failed to send push notification via Expo:', response.statusText);
      }
    }
  } catch (err) {
    console.warn('Error sending push notification:', err);
  }
}
