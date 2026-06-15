import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useShoppingStore } from '../store/useShoppingStore';
import { VibeText } from './ui/Text';
import { VibeCard } from './ui/Card';
import { ShoppingBag, Users } from 'lucide-react-native';
import { Haptics } from '../services/haptics';
import { registerForPushNotifications } from '../services/notifications';

const { width } = Dimensions.get('window');

export const RoleOnboarding: React.FC = () => {
  const { colors, isDark } = useTheme();
  const updateSettings = useShoppingStore((state) => state.updateSettings);

  const handleSelectRole = async (role: 'husband' | 'wife') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // 1. Update settings locally
    updateSettings({
      currentUserRole: role,
      userName: role === 'husband' ? 'Husband' : 'Wife',
      partnerName: role === 'husband' ? 'Wife' : 'Husband',
    });

    // 2. Register for push notifications and sync token
    await registerForPushNotifications(role);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Icon & Title */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: colors.cardSecondary }]}>
          <Users size={32} color={colors.primary} />
        </View>
        <VibeText variant="bold" size="lg" style={styles.title}>
          Welcome to VibeCart!
        </VibeText>
        <VibeText size="sm" color="textMuted" style={styles.subtitle}>
          This app splits your shopping list in real-time. Choose your role to automatically divide assignments.
        </VibeText>
      </View>

      {/* Role Selector Cards */}
      <View style={styles.cardContainer}>
        {/* Husband Option */}
        <VibeCard
          onPress={() => handleSelectRole('husband')}
          style={[styles.roleCard, { borderColor: colors.border }]}
          variant="outlined"
        >
          <View style={[styles.avatarCircle, { backgroundColor: 'rgba(130, 10, 209, 0.1)' }]}>
            <VibeText variant="bold" style={{ color: '#820AD1', fontSize: 28 }}>H</VibeText>
          </View>
          <VibeText variant="bold" size="md" style={styles.roleTitle}>
            I am the Husband
          </VibeText>
          <VibeText size="xs" color="textMuted" style={styles.roleDesc}>
            Default categories: Meat, Frozen, Pantry, and Kitchen.
          </VibeText>
        </VibeCard>

        {/* Wife Option */}
        <VibeCard
          onPress={() => handleSelectRole('wife')}
          style={[styles.roleCard, { borderColor: colors.border }]}
          variant="outlined"
        >
          <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255, 107, 139, 0.1)' }]}>
            <VibeText variant="bold" style={{ color: '#FF6B8B', fontSize: 28 }}>W</VibeText>
          </View>
          <VibeText variant="bold" size="md" style={styles.roleTitle}>
            I am the Wife
          </VibeText>
          <VibeText size="xs" color="textMuted" style={styles.roleDesc}>
            Default categories: Produce, Bakery, Dairy, and Fruits.
          </VibeText>
        </VibeCard>
      </View>

      {/* Co-op Badge Indicator */}
      <View style={[styles.footerBadge, { backgroundColor: colors.cardSecondary }]}>
        <ShoppingBag size={14} color={colors.primary} style={{ marginRight: 6 }} />
        <VibeText variant="semibold" size="xs" color="textMuted">
          Shared real-time sync with notification broadcasts
        </VibeText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 18,
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  roleCard: {
    width: (width - 64) / 2,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  roleTitle: {
    textAlign: 'center',
    marginBottom: 6,
    fontSize: 14,
  },
  roleDesc: {
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
});
