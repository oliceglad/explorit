import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing } from '@/constants/typography';

export default function EventsScreen() {
  const c = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Text style={[Typography.capUp, { color: c.text3 }]}>События</Text>
        <Text style={[Typography.h1, { color: c.text1, marginTop: 2 }]}>В Самаре</Text>
      </View>
      <View style={styles.empty}>
        <Text style={{ fontSize: 40 }}>🎭</Text>
        <Text style={[Typography.body, { color: c.text3, marginTop: 12, textAlign: 'center' }]}>
          События загружаются из Яндекс Афиши{'\n'}раз в сутки
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.screen, paddingTop: 8, paddingBottom: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
