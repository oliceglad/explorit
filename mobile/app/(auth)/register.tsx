import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth';

export default function Register() {
  const c = useTheme();
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mapBackendError = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes('value is not a valid email')) return 'Некорректный формат email';
    if (m.includes('field required')) return 'Обязательное поле';
    if (m.includes('at least')) {
      const match = m.match(/at least (\d+)/);
      return `Минимум ${match ? match[1] : 4} символов`;
    }
    return msg;
  };

  const handleRegister = async () => {
    setErrors({});
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Введите email';
    if (!nickname) newErrors.nickname = 'Введите никнейм';
    if (!password || password.length < 4) newErrors.password = 'Минимум 4 символа';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    try {
      await register(email.trim(), nickname.trim(), password);
      router.replace('/(tabs)/map');
    } catch (e: any) {
      const responseData = e?.response?.data;
      const detail = responseData?.detail;

      if (Array.isArray(detail)) {
        const fieldErrors: Record<string, string> = {};
        detail.forEach((err: any) => {
          const field = err.loc[err.loc.length - 1];
          fieldErrors[field] = mapBackendError(err.msg);
        });
        setErrors(fieldErrors);
      } else if (typeof detail === 'string') {
        const lowerDetail = detail.toLowerCase();
        if (lowerDetail.includes('email') || lowerDetail.includes('почта')) {
          setErrors({ email: detail });
        } else if (lowerDetail.includes('nickname') || lowerDetail.includes('никнейм') || lowerDetail.includes('имя')) {
          setErrors({ nickname: detail });
        } else if (lowerDetail.includes('password') || lowerDetail.includes('пароль')) {
          setErrors({ password: detail });
        } else {
          setErrors({ general: detail });
        }
      } else {
        setErrors({ general: 'Не удалось зарегистрироваться. Попробуйте еще раз.' });
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
          Создай профиль
        </Text>

        {!!errors.general && (
          <View style={[styles.errorBanner, { backgroundColor: `${c.danger}12`, borderColor: c.danger }]}>
            <Text style={[Typography.cap, { color: c.danger, textAlign: 'center' }]}>{errors.general}</Text>
          </View>
        )}

        <View style={styles.form}>
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
            label="Никнейм"
            placeholder="explorer_samara"
            value={nickname}
            onChangeText={(v) => { setNickname(v); setErrors((e) => ({ ...e, nickname: '' })); }}
            autoCapitalize="none"
            error={errors.nickname}
            style={{ marginTop: 16 }}
          />
          <Input
            label="Пароль"
            placeholder="Придумай пароль"
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
            secureTextEntry={!showPassword}
            error={errors.password}
            style={{ marginTop: 16 }}
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={[Typography.cap, { color: c.text3 }]}>{showPassword ? 'Скрыть' : 'Показать'}</Text>
              </TouchableOpacity>
            }
          />
          <Text style={[Typography.micro, { color: c.text3, marginTop: 6 }]}>
            Не менее 4 символов
          </Text>
        </View>

        <Text style={[Typography.cap, { color: c.text3, textAlign: 'center', marginTop: 20 }]}>
          Продолжая, вы соглашаетесь с Условиями использования
        </Text>

        <Button
          label="Создать аккаунт"
          size="lg"
          block
          loading={isLoading}
          onPress={handleRegister}
          style={{ marginTop: 16 }}
        />

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: c.border }]} />
          <Text style={[Typography.cap, { color: c.text3, marginHorizontal: 12 }]}>или</Text>
          <View style={[styles.line, { backgroundColor: c.border }]} />
        </View>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={[Typography.body, { color: c.text2, textAlign: 'center' }]}>
            Уже есть аккаунт? <Text style={{ color: c.text1, fontFamily: 'Manrope_600SemiBold' }}>Войти</Text>
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
  form: { marginTop: 32 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1 },
  errorBanner: {
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 16,
  },
});
