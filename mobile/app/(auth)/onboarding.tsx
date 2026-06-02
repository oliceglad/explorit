import React from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing } from '@/constants/typography';
import { Button } from '@/components/ui/Button';

const { width, height } = Dimensions.get('window');

export default function Onboarding() {
  const c = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={[styles.logoSquare, { backgroundColor: c.text1 }]} />
          <Text style={[Typography.h2, { color: c.text1, marginLeft: 10 }]}>Explorit</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.dicePulseOuter, { borderColor: c.accent }]} />
          <View style={[styles.dicePulseInner, { borderColor: c.accent }]} />
          <View style={[styles.diceBox, { backgroundColor: c.accent }]}>
            <Text style={{ fontSize: 40 }}>🎲</Text>
          </View>

          {/* Floating chips */}
          {['Набережная', 'Кофейня', 'Парк Гагарина'].map((name, i) => (
            <View
              key={name}
              style={[
                styles.floatingChip,
                { backgroundColor: c.surface, shadowColor: c.shadow1 },
                i === 0 && { top: '20%', left: '5%' },
                i === 1 && { top: '60%', right: '3%' },
                i === 2 && { bottom: '15%', left: '8%' },
              ]}
            >
              <Text style={[Typography.cap, { color: c.text1 }]}>{name}</Text>
            </View>
          ))}
        </View>

        {/* Copy */}
        <View style={styles.copy}>
          <Text style={[Typography.display, { color: c.text1, fontSize: 40, textAlign: 'center' }]}>
            Загляни туда,{'\n'}где ещё не был.
          </Text>
          <Text style={[Typography.body, { color: c.text2, textAlign: 'center', marginTop: 14 }]}>
            Случайный маршрут по городу с точками, которые подобраны под тебя
          </Text>
        </View>

        {/* Pagination dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === 0 ? c.text1 : c.surface3 }]}
            />
          ))}
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Button label="Начать" size="lg" block onPress={() => router.push('/(auth)/register')} />
          <Button
            label="У меня уже есть аккаунт"
            variant="ghost"
            size="lg"
            block
            onPress={() => router.push('/(auth)/login')}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.screen },
  logoRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 16 },
  logoSquare: { width: 28, height: 28, borderRadius: 8 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dicePulseOuter: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, opacity: 0.15 },
  dicePulseInner: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, opacity: 0.25 },
  diceBox: { width: 96, height: 96, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  floatingChip: {
    position: 'absolute', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, elevation: 4, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  copy: { paddingBottom: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cta: { paddingBottom: 32 },
});
