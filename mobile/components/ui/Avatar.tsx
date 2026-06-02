import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const PALETTE = ['#5FB348', '#3A82C2', '#D9803A', '#9B59B6', '#E74C3C', '#1ABC9C'];

interface Props {
  uri?: string;
  name?: string;
  size?: number;
}

export function Avatar({ uri, name, size = 40 }: Props) {
  const c = useTheme();
  const letter = name?.[0]?.toUpperCase() ?? '?';
  const colorIndex = name ? name.charCodeAt(0) % PALETTE.length : 0;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: PALETTE[colorIndex] },
      ]}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontFamily: 'Manrope_700Bold' }}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
