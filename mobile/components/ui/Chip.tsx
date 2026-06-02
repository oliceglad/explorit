import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Radius } from '@/constants/typography';

type ChipVariant = 'default' | 'active' | 'outline' | 'accent';
type ChipSize = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  variant?: ChipVariant;
  size?: ChipSize;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, variant = 'default', size = 'md', onPress, style }: Props) {
  const c = useTheme();

  const heights: Record<ChipSize, number> = { sm: 22, md: 32, lg: 40 };
  const height = heights[size];

  const bg: Record<ChipVariant, string> = {
    default: c.surface2, active: c.text1, outline: 'transparent', accent: c.accentSoft,
  };
  const textColor: Record<ChipVariant, string> = {
    default: c.text2, active: c.bg, outline: c.text2, accent: c.accentStrong,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          height,
          backgroundColor: bg[variant],
          borderRadius: Radius.pill,
        },
        variant === 'outline' && { borderWidth: 1, borderColor: c.border2 },
        style,
      ]}
    >
      <Text style={[Typography.cap, { color: textColor[variant] }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
});
