// VibeCart Color Palette Constants

export const Palette = {
  // Brand Colors
  mainPurple: '#820AD1',
  lightPurple: '#A855F7',
  darkPurple: '#5B0A8E',
  white: '#FFFFFF',
  
  // Dark Theme Colors
  darkBg: '#111111',
  darkCard: '#1C1C1E',
  darkCardSecondary: '#2C2C2E',
  darkText: '#FFFFFF',
  darkTextMuted: '#A0A0A0',
  darkBorder: '#2A2A2C',

  // Light Theme Colors
  lightBg: '#F5F5F7',
  lightCard: '#FFFFFF',
  lightCardSecondary: '#E9E9EB',
  lightText: '#111111',
  lightTextMuted: '#6E6E73',
  lightBorder: '#E5E5EA',

  // Semantic Colors
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
};

export const Colors = {
  light: {
    background: Palette.lightBg,
    card: Palette.lightCard,
    cardSecondary: Palette.lightCardSecondary,
    text: Palette.lightText,
    textMuted: Palette.lightTextMuted,
    border: Palette.lightBorder,
    
    primary: Palette.mainPurple,
    primaryLight: Palette.lightPurple,
    primaryDark: Palette.darkPurple,
    white: Palette.white,
    
    error: Palette.error,
    success: Palette.success,
    warning: Palette.warning,
  },
  dark: {
    background: Palette.darkBg,
    card: Palette.darkCard,
    cardSecondary: Palette.darkCardSecondary,
    text: Palette.darkText,
    textMuted: Palette.darkTextMuted,
    border: Palette.darkBorder,
    
    primary: Palette.mainPurple,
    primaryLight: Palette.lightPurple,
    primaryDark: Palette.darkPurple,
    white: Palette.white,
    
    error: Palette.error,
    success: Palette.success,
    warning: Palette.warning,
  },
};

export type ThemeType = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;
