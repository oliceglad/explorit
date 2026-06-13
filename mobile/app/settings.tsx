import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, Platform, Modal,
  TextInput, ActivityIndicator, ActionSheetIOS, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore, ThemeMode } from '@/store/theme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { authApi, profileApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';

const APP_VERSION = '1.0.0';
const APP_NAME = 'Explorit';

const LANG_KEY = 'app-language';
const NOTIF_KEY = 'notifications-enabled';
const VISIBILITY_KEY = 'profile-public';

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M12 19l-7-7 7-7" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} stroke={color} strokeWidth={1.75} />
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Svg>
  );
}

function SunIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={1.75} />
      <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function GlobeIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.75} />
      <Path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function EyeIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={1.75} />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function MapPinIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={color} strokeWidth={1.75} />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function InfoIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.75} />
      <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ZapIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Reusable components ──────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const c = useTheme();
  return (
    <Text style={[Typography.capUp, { color: c.text3, paddingHorizontal: Spacing.screen, paddingTop: 24, paddingBottom: 8 }]}>
      {title}
    </Text>
  );
}

function SettingRow({
  icon, label, sublabel, onPress, rightElement, danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) {
  const c = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: c.surface, borderBottomColor: c.border }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconBox, { backgroundColor: danger ? '#E74C3C18' : c.surface2 }]}>
        {icon}
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={[Typography.body, { color: danger ? '#E74C3C' : c.text1 }]}>{label}</Text>
        {sublabel ? <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>{sublabel}</Text> : null}
      </View>
      {rightElement ?? (onPress ? <ChevronIcon color={c.text3} /> : null)}
    </TouchableOpacity>
  );
}

// Generic full-screen modal with header
function FullModal({
  visible, title, onClose, children,
}: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={onClose} style={{ paddingRight: 16 }}>
            <BackIcon color={c.text1} />
          </TouchableOpacity>
          <Text style={[Typography.bodyStrong, { color: c.text1, flex: 1 }]}>{title}</Text>
        </View>
        {children}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const c = useTheme();
  const router = useRouter();
  const { logout } = useAuthStore();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

  // Toggle state
  const [notifications, setNotifications] = useState(true);
  const [geo, setGeo] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');

  // Modal visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Change password form
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState('');

  // Delete account
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load saved prefs on mount
  useEffect(() => {
    (async () => {
      const [lang, notif, vis] = await Promise.all([
        AsyncStorage.getItem(LANG_KEY),
        AsyncStorage.getItem(NOTIF_KEY),
        AsyncStorage.getItem(VISIBILITY_KEY),
      ]);
      if (lang) setLanguage(lang as 'ru' | 'en');
      if (notif !== null) setNotifications(notif === 'true');
      if (vis !== null) setPublicProfile(vis !== 'false');
      // Geo: check actual permission status
      const { status } = await Location.getForegroundPermissionsAsync();
      setGeo(status === 'granted');
    })();
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleThemePick = () => {
    const options = ['Системная', 'Светлая', 'Тёмная', 'Отмена'];
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, title: 'Тема приложения' },
        (idx) => { if (idx < 3) setThemeMode(modes[idx]); }
      );
    } else {
      Alert.alert('Тема приложения', undefined, [
        ...modes.map((m, i) => ({ text: options[i], onPress: () => setThemeMode(m) })),
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  };

  const handleLanguagePick = () => {
    const langs: ('ru' | 'en')[] = ['ru', 'en'];
    const labels = ['Русский', 'English'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...labels, 'Отмена'], cancelButtonIndex: 2, title: 'Язык интерфейса' },
        async (idx) => {
          if (idx < 2) {
            setLanguage(langs[idx]);
            await AsyncStorage.setItem(LANG_KEY, langs[idx]);
            if (langs[idx] === 'en') {
              Alert.alert('Coming soon', 'Full English interface is on the way!');
            }
          }
        }
      );
    } else {
      Alert.alert('Язык интерфейса', undefined, [
        ...langs.map((l, i) => ({
          text: labels[i],
          onPress: async () => {
            setLanguage(l);
            await AsyncStorage.setItem(LANG_KEY, l);
            if (l === 'en') Alert.alert('Coming soon', 'Full English interface is on the way!');
          },
        })),
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  };

  const handleGeoToggle = async (value: boolean) => {
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setGeo(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Нет доступа', 'Разрешите геолокацию в настройках устройства');
      }
    } else {
      Alert.alert(
        'Отключить геолокацию?',
        'Перейдите в настройки устройства → Explorit → Геолокация, чтобы отозвать разрешение.',
        [{ text: 'ОК' }]
      );
    }
  };

  const handleNotifToggle = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem(NOTIF_KEY, String(value));
    if (!value) {
      Alert.alert(
        'Уведомления отключены',
        'Чтобы полностью отключить уведомления — перейдите в настройки устройства → Уведомления → Explorit.',
        [{ text: 'ОК' }]
      );
    }
  };

  const handleVisibilityToggle = async (value: boolean) => {
    setPublicProfile(value);
    await AsyncStorage.setItem(VISIBILITY_KEY, String(value));
    // Sync to backend
    profileApi.update({ is_public: value }).catch(() => {});
  };

  const handleSavePassword = async () => {
    setCpError('');
    if (!cpCurrent || !cpNew || !cpConfirm) {
      setCpError('Заполните все поля');
      return;
    }
    if (cpNew.length < 6) {
      setCpError('Новый пароль — минимум 6 символов');
      return;
    }
    if (cpNew !== cpConfirm) {
      setCpError('Пароли не совпадают');
      return;
    }
    setCpLoading(true);
    try {
      await authApi.changePassword(cpCurrent, cpNew);
      setShowPassword(false);
      setCpCurrent(''); setCpNew(''); setCpConfirm('');
      Alert.alert('Готово', 'Пароль успешно изменён');
    } catch (e: any) {
      setCpError(e?.response?.data?.detail || 'Не удалось изменить пароль');
    } finally {
      setCpLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Ошибка', 'Введите пароль для подтверждения');
      return;
    }
    setDeleteLoading(true);
    try {
      // Verify password first via change-password with same new password
      await authApi.changePassword(deletePassword, deletePassword);
      // If that passed — password is correct, now delete
      await authApi.deleteAccount();
      setShowDeleteConfirm(false);
      await logout();
      router.replace('/(auth)/onboarding');
    } catch (e: any) {
      const msg = e?.response?.data?.detail || '';
      if (msg === 'Неверный текущий пароль') {
        Alert.alert('Ошибка', 'Неверный пароль');
      } else {
        Alert.alert('Ошибка', 'Не удалось удалить аккаунт');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const themeLabel = themeMode === 'system' ? 'Системная' : themeMode === 'light' ? 'Светлая' : 'Тёмная';
  const langLabel = language === 'ru' ? 'Русский' : 'English';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon color={c.text1} />
        </TouchableOpacity>
        <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Account */}
        <SectionHeader title="Аккаунт" />
        <View style={[styles.section, { borderRadius: Radius.card, marginHorizontal: Spacing.screen }]}>
          <SettingRow
            icon={<LockIcon color="#3A82C2" />}
            label="Безопасность и пароль"
            sublabel="Изменить пароль от аккаунта"
            onPress={() => { setCpCurrent(''); setCpNew(''); setCpConfirm(''); setCpError(''); setShowPassword(true); }}
          />
          <SettingRow
            icon={<StarIcon color="#D9803A" />}
            label="Explorit Pro"
            sublabel="Расширенные возможности"
            onPress={() => setShowSubscription(true)}
          />
        </View>

        {/* Appearance */}
        <SectionHeader title="Оформление" />
        <View style={[styles.section, { borderRadius: Radius.card, marginHorizontal: Spacing.screen }]}>
          <SettingRow
            icon={<SunIcon color="#9B59B6" />}
            label="Тема приложения"
            sublabel={themeLabel}
            onPress={handleThemePick}
          />
          <SettingRow
            icon={<GlobeIcon color="#1ABC9C" />}
            label="Язык интерфейса"
            sublabel={langLabel}
            onPress={handleLanguagePick}
          />
        </View>

        {/* Privacy */}
        <SectionHeader title="Конфиденциальность" />
        <View style={[styles.section, { borderRadius: Radius.card, marginHorizontal: Spacing.screen }]}>
          <SettingRow
            icon={<EyeIcon color="#5FB348" />}
            label="Публичный профиль"
            sublabel={publicProfile ? 'Виден всем пользователям' : 'Только для вас'}
            rightElement={
              <Switch
                value={publicProfile}
                onValueChange={handleVisibilityToggle}
                trackColor={{ false: c.surface2, true: c.accent }}
                thumbColor={Platform.OS === 'android' ? (publicProfile ? '#fff' : c.text3) : undefined}
              />
            }
          />
          <SettingRow
            icon={<MapPinIcon color="#E74C3C" />}
            label="Геолокация"
            sublabel={geo ? 'Разрешена' : 'Запрещена'}
            rightElement={
              <Switch
                value={geo}
                onValueChange={handleGeoToggle}
                trackColor={{ false: c.surface2, true: c.accent }}
                thumbColor={Platform.OS === 'android' ? (geo ? '#fff' : c.text3) : undefined}
              />
            }
          />
          <SettingRow
            icon={<BellIcon color="#D9803A" />}
            label="Уведомления"
            sublabel={notifications ? 'Включены' : 'Отключены'}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={handleNotifToggle}
                trackColor={{ false: c.surface2, true: c.accent }}
                thumbColor={Platform.OS === 'android' ? (notifications ? '#fff' : c.text3) : undefined}
              />
            }
          />
        </View>

        {/* Danger */}
        <SectionHeader title="Опасная зона" />
        <View style={[styles.section, { borderRadius: Radius.card, marginHorizontal: Spacing.screen }]}>
          <SettingRow
            icon={<TrashIcon color="#E74C3C" />}
            label="Удалить аккаунт"
            sublabel="Все данные будут удалены навсегда"
            onPress={() => { setDeletePassword(''); setShowDeleteConfirm(true); }}
            danger
          />
        </View>

        {/* About */}
        <SectionHeader title="О приложении" />
        <View style={[styles.section, { borderRadius: Radius.card, marginHorizontal: Spacing.screen }]}>
          <SettingRow
            icon={<InfoIcon color={c.text3} />}
            label={APP_NAME}
            rightElement={<Text style={[Typography.cap, { color: c.text3 }]}>v{APP_VERSION}</Text>}
          />
          <SettingRow
            icon={<InfoIcon color={c.text3} />}
            label="Политика конфиденциальности"
            onPress={() => setShowPrivacy(true)}
          />
          <SettingRow
            icon={<InfoIcon color={c.text3} />}
            label="Пользовательское соглашение"
            onPress={() => setShowTerms(true)}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Change Password Modal ─────────────────────────────────────────────── */}
      <FullModal visible={showPassword} title="Смена пароля" onClose={() => setShowPassword(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.screen }}>
            <Text style={[Typography.cap, { color: c.text2, marginBottom: 20, lineHeight: 18 }]}>
              Введите текущий пароль, затем придумайте новый (минимум 6 символов).
            </Text>

            <PasswordField label="Текущий пароль" value={cpCurrent} onChange={setCpCurrent} />
            <PasswordField label="Новый пароль" value={cpNew} onChange={setCpNew} style={{ marginTop: 12 }} />
            <PasswordField label="Повторите новый пароль" value={cpConfirm} onChange={setCpConfirm} style={{ marginTop: 12 }} />

            {cpError ? (
              <Text style={[Typography.cap, { color: c.danger, marginTop: 12 }]}>{cpError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: c.accent, marginTop: 24, opacity: cpLoading ? 0.6 : 1 }]}
              onPress={handleSavePassword}
              disabled={cpLoading}
            >
              {cpLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={[Typography.bodyStrong, { color: '#fff' }]}>Сохранить пароль</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </FullModal>

      {/* ── Subscription Modal ────────────────────────────────────────────────── */}
      <FullModal visible={showSubscription} title="Explorit Pro" onClose={() => setShowSubscription(false)}>
        <ScrollView contentContainerStyle={{ padding: Spacing.screen }}>
          {/* Pro hero */}
          <View style={[styles.proHero, { backgroundColor: c.text1 }]}>
            <ZapIcon color={c.accent} />
            <Text style={[Typography.h2, { color: c.bg, marginTop: 10 }]}>Explorit Pro</Text>
            <Text style={[Typography.cap, { color: `${c.bg}99`, marginTop: 6, textAlign: 'center' }]}>
              Максимум возможностей для городских исследователей
            </Text>
          </View>

          {/* Plans */}
          <PlanCard
            title="Бесплатно"
            price="0 ₽"
            features={[
              'До 10 маршрутов в месяц',
              'Базовые категории мест',
              'Публикация постов',
              'Участие в рейтинге',
            ]}
            isActive
          />
          <PlanCard
            title="Pro — Ежемесячно"
            price="199 ₽ / мес"
            features={[
              'Безлимитные маршруты',
              'Все категории мест',
              'Приоритет в рейтинге',
              'Кооперативные маршруты',
              'Эксклюзивные задания',
              'Без рекламы',
            ]}
            accent
          />
          <PlanCard
            title="Pro — Годовая"
            price="1 490 ₽ / год"
            badge="Выгода 38%"
            features={[
              'Всё из Pro-ежемесячной',
              'Доступ к бета-функциям',
              'Персональный значок',
            ]}
            accent
          />

          <Text style={[Typography.micro, { color: c.text3, textAlign: 'center', marginTop: 16, lineHeight: 18 }]}>
            Оплата производится через App Store / Google Play.{'\n'}
            Подписка автоматически продлевается. Отмена — в любой момент.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: c.accent, marginTop: 24 }]}
            onPress={() => Alert.alert('Скоро', 'Оформление подписки появится в следующем обновлении')}
          >
            <Text style={[Typography.bodyStrong, { color: '#fff' }]}>Попробовать Pro</Text>
          </TouchableOpacity>
        </ScrollView>
      </FullModal>

      {/* ── Delete Account Modal ──────────────────────────────────────────────── */}
      <FullModal visible={showDeleteConfirm} title="Удаление аккаунта" onClose={() => setShowDeleteConfirm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.screen }}>
            <View style={[styles.dangerBanner, { backgroundColor: '#E74C3C18' }]}>
              <TrashIcon color="#E74C3C" />
              <Text style={[Typography.cap, { color: '#E74C3C', flex: 1, marginLeft: 12, lineHeight: 18 }]}>
                Это действие необратимо. Все ваши маршруты, посты, достижения и данные будут удалены навсегда.
              </Text>
            </View>

            <Text style={[Typography.bodyStrong, { color: c.text1, marginTop: 24, marginBottom: 8 }]}>
              Введите пароль для подтверждения
            </Text>
            <PasswordField label="Пароль" value={deletePassword} onChange={setDeletePassword} />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#E74C3C', marginTop: 24, opacity: deleteLoading ? 0.6 : 1 }]}
              onPress={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={[Typography.bodyStrong, { color: '#fff' }]}>Удалить аккаунт навсегда</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </FullModal>

      {/* ── Privacy Policy Modal ──────────────────────────────────────────────── */}
      <FullModal visible={showPrivacy} title="Политика конфиденциальности" onClose={() => setShowPrivacy(false)}>
        <ScrollView contentContainerStyle={styles.legalContent} showsVerticalScrollIndicator={false}>
          <LegalText title="1. Общие положения">
            Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей мобильного приложения Explorit (далее — «Приложение»). Используя Приложение, вы соглашаетесь с условиями настоящей Политики.
          </LegalText>
          <LegalText title="2. Собираемые данные">
            Мы можем собирать следующие категории данных:{'\n\n'}
            • Учётные данные: адрес электронной почты, никнейм, хешированный пароль.{'\n'}
            • Данные профиля: имя, биография, город, интересы, фотография профиля.{'\n'}
            • Данные геолокации: координаты устройства (только при активной сессии и с разрешения пользователя).{'\n'}
            • Контент пользователя: публикации, маршруты, фотографии, комментарии.{'\n'}
            • Технические данные: идентификатор устройства, версия ОС, логи ошибок.
          </LegalText>
          <LegalText title="3. Цели обработки">
            Собранные данные используются для:{'\n\n'}
            • предоставления основного функционала Приложения;{'\n'}
            • персонализации контента и маршрутов;{'\n'}
            • обеспечения безопасности аккаунта;{'\n'}
            • улучшения качества сервиса и устранения ошибок;{'\n'}
            • соблюдения требований действующего законодательства.
          </LegalText>
          <LegalText title="4. Хранение и защита">
            Данные хранятся на защищённых серверах. Мы применяем шифрование при передаче данных (HTTPS/TLS) и хешируем пароли с использованием современных алгоритмов. Срок хранения данных — в течение всего времени использования аккаунта и 30 дней после его удаления.
          </LegalText>
          <LegalText title="5. Передача третьим лицам">
            Мы не продаём и не передаём ваши персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством, или при наличии вашего явного согласия. Аналитические сервисы получают только обезличенные агрегированные данные.
          </LegalText>
          <LegalText title="6. Права пользователя">
            Вы имеете право:{'\n\n'}
            • запросить копию своих данных;{'\n'}
            • исправить неточные сведения через настройки профиля;{'\n'}
            • удалить аккаунт и все связанные данные (раздел «Настройки → Удалить аккаунт»);{'\n'}
            • отозвать разрешение на геолокацию в настройках устройства.
          </LegalText>
          <LegalText title="7. Контакт">
            По вопросам обработки персональных данных обращайтесь: privacy@explorit.app
          </LegalText>
          <Text style={{ color: '#9BA29D', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
            Последнее обновление: январь 2025
          </Text>
        </ScrollView>
      </FullModal>

      {/* ── Terms of Service Modal ────────────────────────────────────────────── */}
      <FullModal visible={showTerms} title="Пользовательское соглашение" onClose={() => setShowTerms(false)}>
        <ScrollView contentContainerStyle={styles.legalContent} showsVerticalScrollIndicator={false}>
          <LegalText title="1. Предмет соглашения">
            Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между ООО «Эксплорит» (далее — «Компания») и физическим лицом (далее — «Пользователь»), использующим мобильное приложение Explorit.
          </LegalText>
          <LegalText title="2. Принятие условий">
            Регистрируясь в Приложении или начиная его использование, Пользователь принимает все условия настоящего Соглашения. Если вы не согласны с условиями — прекратите использование Приложения.
          </LegalText>
          <LegalText title="3. Описание сервиса">
            Explorit — платформа для городских исследований, позволяющая пользователям:{'\n\n'}
            • строить и сохранять маршруты по интересным местам города;{'\n'}
            • делиться впечатлениями через публикации;{'\n'}
            • участвовать в системе достижений и рейтинге;{'\n'}
            • взаимодействовать с другими исследователями.
          </LegalText>
          <LegalText title="4. Обязательства пользователя">
            Пользователь обязуется:{'\n\n'}
            • предоставлять достоверные данные при регистрации;{'\n'}
            • не передавать данные аккаунта третьим лицам;{'\n'}
            • не публиковать контент, нарушающий права третьих лиц, содержащий ненависть, угрозы или незаконные материалы;{'\n'}
            • не использовать Приложение в коммерческих целях без письменного согласия Компании;{'\n'}
            • не предпринимать попыток взлома, обратного инжиниринга или несанкционированного доступа к системам.
          </LegalText>
          <LegalText title="5. Контент пользователя">
            Публикуя контент (фотографии, маршруты, тексты), Пользователь предоставляет Компании неисключительную лицензию на его использование в рамках сервиса. Пользователь гарантирует, что обладает необходимыми правами на публикуемый контент.
          </LegalText>
          <LegalText title="6. Ограничение ответственности">
            Компания не несёт ответственности за:{'\n\n'}
            • прерывание работы сервиса по независящим от неё причинам;{'\n'}
            • действия третьих лиц, с которыми Пользователь взаимодействует через Приложение;{'\n'}
            • достоверность информации о местах, предоставленной третьими сторонами;{'\n'}
            • любые косвенные убытки, возникшие в результате использования Приложения.
          </LegalText>
          <LegalText title="7. Изменение условий">
            Компания вправе изменять условия настоящего Соглашения, уведомив Пользователей не менее чем за 7 дней до вступления изменений в силу через уведомление в Приложении.
          </LegalText>
          <LegalText title="8. Применимое право">
            Настоящее Соглашение регулируется законодательством Российской Федерации. Споры разрешаются в претензионном порядке, а при недостижении согласия — в суде по месту нахождения Компании.
          </LegalText>
          <LegalText title="9. Контакт">
            По вопросам, связанным с Соглашением: legal@explorit.app
          </LegalText>
          <Text style={{ color: '#9BA29D', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
            Последнее обновление: январь 2025
          </Text>
        </ScrollView>
      </FullModal>
    </SafeAreaView>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function PasswordField({
  label, value, onChange, style,
}: {
  label: string; value: string; onChange: (v: string) => void; style?: object;
}) {
  const c = useTheme();
  const [show, setShow] = useState(false);
  return (
    <View style={[styles.inputWrap, { backgroundColor: c.surface2, borderRadius: Radius.md }, style]}>
      <TextInput
        style={[Typography.body, { color: c.text1, flex: 1, padding: 14 }]}
        placeholder={label}
        placeholderTextColor={c.text3}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity onPress={() => setShow((p) => !p)} style={{ paddingRight: 14 }}>
        <Text style={[Typography.cap, { color: c.text3 }]}>{show ? 'Скрыть' : 'Показать'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PlanCard({
  title, price, features, isActive, accent, badge,
}: {
  title: string; price: string; features: string[];
  isActive?: boolean; accent?: boolean; badge?: string;
}) {
  const c = useTheme();
  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: accent ? c.text1 : c.surface,
          borderColor: accent ? c.accent : c.border,
          borderWidth: accent ? 1.5 : 1,
          marginTop: 12,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={[Typography.bodyStrong, { color: accent ? c.bg : c.text1 }]}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: c.accent }]}>
            <Text style={[Typography.micro, { color: '#fff' }]}>{badge}</Text>
          </View>
        )}
        {isActive && (
          <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
            <Text style={[Typography.micro, { color: c.accent }]}>Текущий</Text>
          </View>
        )}
      </View>
      <Text style={[Typography.h2, { color: accent ? c.accent : c.text1, marginBottom: 12 }]}>{price}</Text>
      {features.map((f) => (
        <View key={f} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <CheckIcon color={accent ? c.accent : c.text2} />
          <Text style={[Typography.cap, { color: accent ? `${c.bg}CC` : c.text2, marginLeft: 8 }]}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

function LegalText({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[Typography.bodyStrong, { color: c.text1, marginBottom: 6 }]}>{title}</Text>
      <Text style={[Typography.cap, { color: c.text2, lineHeight: 20 }]}>{children}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  section: { overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1,
  },
  primaryBtn: {
    height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center',
  },
  inputWrap: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  proHero: {
    borderRadius: Radius.card, padding: 24, alignItems: 'center', marginBottom: 4,
  },
  planCard: {
    borderRadius: Radius.card, padding: 16,
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill,
  },
  dangerBanner: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: Radius.md,
  },
  legalContent: {
    padding: Spacing.screen, paddingBottom: 40,
  },
});
