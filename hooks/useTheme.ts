import { Colors } from '../constants/Colors';
import { useShoppingStore } from '../store/useShoppingStore';

export function useTheme() {
  const theme = useShoppingStore((state) => state.settings.theme);
  const toggleTheme = useShoppingStore((state) => state.toggleTheme);
  
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  return {
    theme,
    colors,
    isDark,
    toggleTheme,
  };
}
