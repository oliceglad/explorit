import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/colors';

export type ThemeColors = {
  bg: string; surface: string; surface2: string; surface3: string;
  text1: string; text2: string; text3: string;
  border: string; border2: string;
  accent: string; accentStrong: string; accentSoft: string;
  warn: string; danger: string; info: string;
  water: string; park: string; shadow1: string;
};

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return (scheme === 'dark' ? Colors.dark : Colors.light) as ThemeColors;
}
