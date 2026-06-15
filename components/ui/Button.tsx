import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, View, ViewStyle, StyleProp } from 'react-native';
import { Haptics } from '../../services/haptics';
import { useTheme } from '../../hooks/useTheme';
import { VibeText } from './Text';

interface VibeButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const VibeButton: React.FC<VibeButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
}) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    // Premium haptic click
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getContainerStyles = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    };

    // Size styles
    let sizeStyles: ViewStyle = {};
    if (size === 'sm') {
      sizeStyles = { paddingVertical: 8, paddingHorizontal: 12 };
    } else if (size === 'lg') {
      sizeStyles = { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16 };
    } else {
      sizeStyles = { paddingVertical: 12, paddingHorizontal: 16 };
    }

    // Variant styles
    let variantStyles: ViewStyle = {};
    if (variant === 'primary') {
      variantStyles = {
        backgroundColor: colors.primary,
      };
    } else if (variant === 'secondary') {
      variantStyles = {
        backgroundColor: colors.cardSecondary,
      };
    } else if (variant === 'outline') {
      variantStyles = {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
      };
    } else if (variant === 'ghost') {
      variantStyles = {
        backgroundColor: 'transparent',
      };
    }

    if (disabled) {
      variantStyles.opacity = 0.5;
    }

    return { ...base, ...sizeStyles, ...variantStyles };
  };

  const getTextColor = (): 'white' | 'text' | 'primary' | 'textMuted' => {
    if (disabled) return 'textMuted';
    if (variant === 'primary') return 'white';
    if (variant === 'outline') return 'primary';
    if (variant === 'ghost') return 'primary';
    return 'text';
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled || loading}
      style={[getContainerStyles(), style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : colors.primary} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <VibeText
            variant="semibold"
            size={size === 'sm' ? 'sm' : 'md'}
            color={getTextColor()}
          >
            {title}
          </VibeText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
});
