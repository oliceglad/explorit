import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth';

export default function Login() {
  const c = useTheme();
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async () => {
    setErrors({});
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Введите email';
    if (!password) newErrors.password = 'Введите пароль';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/map');
    } catch (e: any) {
      const responseData = e?.response?.data;
      const detail = responseData?.detail;

      if (typeof detail === 'string') {
        const lowerDetail = detail.toLowerCase();
        if (lowerDetail.includes('email') || lowerDetail.includes('пользовател') || lowerDetail.includes('найден')) {
          setErrors({ email: detail });
        } else if (lowerDetail.includes('password') || lowerDetail.includes('пароль') || lowerDetail.includes('неверн')) {
          setErrors({ password: detail });
        } else {
          setErrors({ general: detail });
        }
      } else {
        setErrors({ general: 'Неверный email или пароль' });
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={[Typography.body, { color: c.text2 }]}>← Назад</Text>
        </TouchableOpacity>

        <Text style={[Typography.display, { color: c.text1, fontSize: 36, marginTop: 24 }]}>
          Добро пожаловать
        </Text>

        {!!errors.general && (
          <View style={[styles.errorBanner, { backgroundColor: `${c.danger}12`, borderColor: c.danger }]}>
            <Text style={[Typography.cap, { color: c.danger, textAlign: 'center' }]}>{errors.general}</Text>
          </View>
        )}

        <View style={{ marginTop: 32 }}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Input
            label="Пароль"
            placeholder="Введите пароль"
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
            secureTextEntry={!showPassword}
            style={{ marginTop: 16 }}
            error={errors.password}
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={[Typography.cap, { color: c.text3 }]}>{showPassword ? 'Скрыть' : 'Показать'}</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <Button
          label="Войти"
          size="lg"
          block
          loading={isLoading}
          onPress={handleLogin}
          style={{ marginTop: 28 }}
        />

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: c.border }]} />
          <Text style={[Typography.cap, { color: c.text3, marginHorizontal: 12 }]}>или</Text>
          <View style={[styles.line, { backgroundColor: c.border }]} />
        </View>

        <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
          <Text style={[Typography.body, { color: c.text2, textAlign: 'center' }]}>
            Нет аккаунта? <Text style={{ color: c.text1, fontFamily: 'Manrope_600SemiBold' }}>Создать</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: Spacing.screen, paddingBottom: 40 },
  back: { paddingTop: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1 },
  errorBanner: {
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 16,
  },
});
