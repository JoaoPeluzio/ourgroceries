import React, { useState } from 'react';
import { TextInput, View, StyleSheet, TouchableOpacity, TextInputProps, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

interface VibeInputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const VibeInput: React.FC<VibeInputProps> = ({
  leftIcon,
  onClear,
  containerStyle,
  style,
  value,
  onChangeText,
  onFocus,
  onBlur,
  placeholderTextColor,
  ...props
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isFocused ? colors.primary : colors.border,
        },
        containerStyle,
      ]}
    >
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={placeholderTextColor || colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            fontFamily: 'Outfit_400Regular',
          },
          style,
        ]}
        {...props}
      />
      {value && onClear && (
        <TouchableOpacity
          onPress={onClear}
          activeOpacity={0.6}
          style={styles.clearButton}
        >
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});
