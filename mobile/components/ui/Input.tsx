import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Radius } from '@/constants/typography';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function Input({ label, error, rightElement, style, ...props }: Props) {
  const c = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      {!!label && (
        <Text style={[Typography.cap, { color: c.text2, marginBottom: 6 }]}>{label}</Text>
      )}
      <View
        style={[
          styles.container,
          { backgroundColor: focused ? c.surface : c.surface2, borderRadius: Radius.md },
          focused && { borderWidth: 1, borderColor: c.text1 },
          !!error && { borderWidth: 1, borderColor: c.danger },
        ]}
      >
        <TextInput
          placeholderTextColor={c.text3}
          style={[Typography.body, styles.input, { color: c.text1 }]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightElement && <View style={styles.right}>{rightElement}</View>}
      </View>
      {!!error && (
        <Text style={[Typography.cap, { color: c.danger, marginTop: 4 }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 52, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: 16, height: '100%' },
  right: { paddingRight: 14 },
});
