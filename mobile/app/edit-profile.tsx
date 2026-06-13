import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Image, Alert, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth';
import { profileApi, uploadsApi, proxyUrl } from '@/services/api';
import Svg, { Path, Circle } from 'react-native-svg';

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Самара', 'Казань', 'Новосибирск',
  'Екатеринбург', 'Нижний Новгород', 'Красноярск', 'Уфа', 'Ростов-на-Дону',
  'Пермь', 'Волгоград', 'Краснодар', 'Воронеж', 'Саратов', 'Тюмень',
  'Тольятти', 'Ижевск', 'Барнаул', 'Иркутск', 'Хабаровск', 'Ярославль',
  'Владивосток', 'Томск', 'Оренбург', 'Кемерово', 'Рязань', 'Челябинск',
  'Омск', 'Другой город',
];

const INTERESTS = [
  'Путешествия', 'Пешие прогулки', 'Велоспорт', 'Активный отдых',
  'Исторические места', 'Музеи и галереи', 'Рестораны и кафе',
  'Природа', 'Архитектура', 'Фотография', 'Спорт', 'Шоппинг',
  'Ночная жизнь', 'Парки и сады', 'Кино и театры', 'Искусство',
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M12 19l-7-7 7-7" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CameraIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Field Component ──────────────────────────────────────────────────────────

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[Typography.micro, { color: c.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user, loadUser } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const filteredCities = citySearch.trim()
    ? CITIES.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()))
    : CITIES;

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('Ошибка', 'Никнейм не может быть пустым');
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = user?.avatar_url;
      if (avatarUri) {
        const { data } = await uploadsApi.avatar(avatarUri);
        avatarUrl = data.url;
      }
      await profileApi.update({
        nickname: nickname.trim(),
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        city: city || null,
        avatar_url: avatarUrl || null,
        interests,
      });
      await loadUser();
      router.back();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.detail || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const avatarSource = avatarUri
    ? { uri: avatarUri }
    : user?.avatar_url
    ? { uri: proxyUrl(user.avatar_url) }
    : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon color={c.text1} />
        </TouchableOpacity>
        <Text style={[Typography.bodyStrong, { color: c.text1, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          Редактировать
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? (
            <ActivityIndicator color={c.accent} size="small" />
          ) : (
            <Text style={[Typography.bodyStrong, { color: c.accent }]}>Сохранить</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatarImg} />
            ) : (
              <Avatar size={96} name={user?.nickname} />
            )}
            <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: c.accent }]} onPress={pickAvatar}>
              <CameraIcon color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={pickAvatar}>
            <Text style={[Typography.cap, { color: c.accent, marginTop: 10 }]}>Изменить фото</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fields}>
          <Field label="Имя">
            <TextInput
              style={[styles.input, { backgroundColor: c.surface2, color: c.text1, fontFamily: 'Manrope_400Regular' }]}
              placeholder="Ваше имя"
              placeholderTextColor={c.text3}
              value={fullName}
              onChangeText={setFullName}
              returnKeyType="next"
            />
          </Field>

          <Field label="Никнейм">
            <TextInput
              style={[styles.input, { backgroundColor: c.surface2, color: c.text1, fontFamily: 'Manrope_400Regular' }]}
              placeholder="@nickname"
              placeholderTextColor={c.text3}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              returnKeyType="next"
            />
          </Field>

          <Field label="О себе">
            <TextInput
              style={[styles.inputMulti, { backgroundColor: c.surface2, color: c.text1, fontFamily: 'Manrope_400Regular' }]}
              placeholder="Расскажи о себе..."
              placeholderTextColor={c.text3}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>

          <Field label="Город">
            <TouchableOpacity
              style={[styles.select, { backgroundColor: c.surface2 }]}
              onPress={() => setCityModalOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={[Typography.body, { color: city ? c.text1 : c.text3, flex: 1 }]}>
                {city || 'Выбери город'}
              </Text>
              <ChevronDownIcon color={c.text3} />
            </TouchableOpacity>
          </Field>

          <Field label="Интересы">
            <View style={styles.tagsWrap}>
              {INTERESTS.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <TouchableOpacity
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: selected ? c.accent : c.surface2,
                        borderColor: selected ? c.accent : c.border,
                      },
                    ]}
                  >
                    <Text style={[Typography.cap, { color: selected ? '#fff' : c.text2 }]}>
                      {interest}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>
        </View>
      </ScrollView>

      {/* City select modal */}
      <Modal visible={cityModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCityModalOpen(false)}>
        <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setCityModalOpen(false)}>
              <Text style={[Typography.body, { color: c.text2 }]}>Отмена</Text>
            </TouchableOpacity>
            <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Выбрать город</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={[styles.citySearch, { backgroundColor: c.surface2, margin: Spacing.screen, borderRadius: Radius.md }]}>
            <TextInput
              style={[Typography.body, { color: c.text1, flex: 1, paddingVertical: 10, paddingHorizontal: 14, fontFamily: 'Manrope_400Regular' }]}
              placeholder="Поиск города..."
              placeholderTextColor={c.text3}
              value={citySearch}
              onChangeText={setCitySearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.cityItem, { borderBottomColor: c.border }]}
                onPress={() => {
                  setCity(item === 'Другой город' ? '' : item);
                  setCitySearch('');
                  setCityModalOpen(false);
                }}
              >
                <Text style={[Typography.body, { color: c.text1, flex: 1 }]}>{item}</Text>
                {city === item && <CheckIcon color={c.accent} />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 44, alignItems: 'flex-start' },
  saveBtn: { width: 80, alignItems: 'flex-end' },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  fields: { paddingHorizontal: Spacing.screen, gap: 20, paddingBottom: 40 },
  fieldWrap: {},
  input: {
    height: 50, paddingHorizontal: 14, borderRadius: Radius.md,
    fontSize: 15,
  },
  inputMulti: {
    minHeight: 100, padding: 14, borderRadius: Radius.md,
    fontSize: 15,
  },
  select: {
    height: 50, paddingHorizontal: 14, borderRadius: Radius.md,
    flexDirection: 'row', alignItems: 'center',
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1,
  },
  citySearch: {},
  cityItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingVertical: 16, borderBottomWidth: 1,
  },
});
