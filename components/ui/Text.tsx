import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface VibeTextProps extends TextProps {
  variant?: 'regular' | 'semibold' | 'bold';
  color?: 'text' | 'textMuted' | 'primary' | 'white' | 'error' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const VibeText: React.FC<VibeTextProps> = ({
  children,
  style,
  variant = 'regular',
  color = 'text',
  size = 'md',
  ...props
}) => {
  const { colors } = useTheme();

  const getFontFamily = () => {
    switch (variant) {
      case 'bold':
        return 'Outfit_700Bold';
      case 'semibold':
        return 'Outfit_600SemiBold';
      case 'regular':
      default:
        return 'Outfit_400Regular';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'xs':
        return 12;
      case 'sm':
        return 14;
      case 'lg':
        return 18;
      case 'xl':
        return 20;
      case '2xl':
        return 24;
      case '3xl':
        return 32;
      case 'md':
      default:
        return 16;
    }
  };

  const getColor = () => {
    switch (color) {
      case 'textMuted':
        return colors.textMuted;
      case 'primary':
        return colors.primary;
      case 'white':
        return colors.white;
      case 'error':
        return colors.error;
      case 'success':
        return colors.success;
      case 'text':
      default:
        return colors.text;
    }
  };

  return (
    <RNText
      style={[
        {
          fontFamily: getFontFamily(),
          fontSize: getFontSize(),
          color: getColor(),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
