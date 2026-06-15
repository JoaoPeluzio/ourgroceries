import { Platform } from 'react-native';

let NativeHaptics: any = null;
if (Platform.OS !== 'web') {
  try {
    NativeHaptics = require('expo-haptics');
  } catch (e) {
    console.warn('Failed to load expo-haptics on native platform:', e);
  }
}

export const Haptics = {
  ImpactFeedbackStyle: {
    Light: Platform.OS === 'web' ? 'light' : (NativeHaptics?.ImpactFeedbackStyle?.Light ?? 'light'),
    Medium: Platform.OS === 'web' ? 'medium' : (NativeHaptics?.ImpactFeedbackStyle?.Medium ?? 'medium'),
    Heavy: Platform.OS === 'web' ? 'heavy' : (NativeHaptics?.ImpactFeedbackStyle?.Heavy ?? 'heavy'),
  },
  NotificationFeedbackType: {
    Success: Platform.OS === 'web' ? 'success' : (NativeHaptics?.NotificationFeedbackType?.Success ?? 'success'),
    Warning: Platform.OS === 'web' ? 'warning' : (NativeHaptics?.NotificationFeedbackType?.Warning ?? 'warning'),
    Error: Platform.OS === 'web' ? 'error' : (NativeHaptics?.NotificationFeedbackType?.Error ?? 'error'),
  },
  impactAsync: async (style: any) => {
    if (Platform.OS !== 'web' && NativeHaptics) {
      try {
        await NativeHaptics.impactAsync(style);
      } catch (e) {
        // Graceful catch for web or unsupported contexts
      }
    }
  },
  notificationAsync: async (type: any) => {
    if (Platform.OS !== 'web' && NativeHaptics) {
      try {
        await NativeHaptics.notificationAsync(type);
      } catch (e) {
        // Graceful catch for web or unsupported contexts
      }
    }
  },
  selectionAsync: async () => {
    if (Platform.OS !== 'web' && NativeHaptics) {
      try {
        await NativeHaptics.selectionAsync();
      } catch (e) {
        // Graceful catch for web or unsupported contexts
      }
    }
  },
};
