import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Radius } from '@/constants/typography';

type Variant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', block, loading, disabled, style }: Props) {
  const c = useTheme();

  const heights: Record<Size, number> = { sm: 40, md: 50, lg: 56 };
  const height = heights[size];

  const bg: Record<Variant, string> = {
    primary: c.text1, accent: c.accent, secondary: c.surface2,
    outline: 'transparent', ghost: 'transparent', danger: c.surface,
  };
  const textColor: Record<Variant, string> = {
    primary: c.bg, accent: c.text1, secondary: c.text1,
    outline: c.text1, ghost: c.text2, danger: c.danger,
  };
  const borderColor: Record<Variant, string | undefined> = {
    primary: undefined, accent: undefined, secondary: undefined,
    outline: c.border2, ghost: undefined, danger: c.border2,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.base,
        { height, backgroundColor: bg[variant], borderRadius: Radius.pill },
        borderColor[variant] ? { borderWidth: 1, borderColor: borderColor[variant] } : null,
        block && styles.block,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : (
        <Text style={[Typography.bodyStrong, { color: textColor[variant] }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  block: { width: '100%' },
  disabled: { opacity: 0.4 },
});
