import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';

interface VibeCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'flat' | 'elevated' | 'outlined';
}

export const VibeCard: React.FC<VibeCardProps> = ({
  children,
  onPress,
  style,
  variant = 'elevated',
}) => {
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
    };

    if (variant === 'elevated') {
      if (isDark) {
        // Subtle border instead of heavy shadow in dark mode
        return {
          ...base,
          borderWidth: 1,
          borderColor: colors.border,
        };
      } else {
        // Elegant soft shadow in light mode
        return {
          ...base,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 2,
        };
      }
    } else if (variant === 'outlined') {
      return {
        ...base,
        borderWidth: 1,
        borderColor: colors.border,
      };
    }

    return base;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        style={[getCardStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[getCardStyle(), style]}>{children}</View>;
};
