import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Image, FlatList, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { postsApi, uploadsApi, proxyUrl, profileApi, geoApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

// ─── Icons ────────────────────────────────────────────────────────────────────

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ImageIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={2} stroke={color} strokeWidth={1.75} />
      <Circle cx={8.5} cy={8.5} r={1.5} fill={color} />
      <Path d="M21 15l-5-5L5 21" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapPinIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={color} strokeWidth={1.75} />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function RouteIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M7 17c0-3.5 2-5.5 5-5.5S17 9 17 5.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx={7} cy={17} r={2} stroke={color} strokeWidth={1.75} />
      <Circle cx={17} cy={5.5} r={2} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={10} cy={10} r={7} stroke={color} strokeWidth={1.75} />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M12 19l-7-7 7-7" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function XSmallIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeoResult {
  lat: number;
  lon: number;
  display_name: string;
  name?: string;
}

interface RouteItem {
  id: string;
  title?: string;
  distance_m?: number;
  duration_min?: number;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreatePost() {
  const c = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { route_id: paramRouteId, route_title: paramRouteTitle } =
    useLocalSearchParams<{ route_id?: string; route_title?: string }>();

  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);   // local URIs
  const [publishing, setPublishing] = useState(false);

  // Place
  const [place, setPlace] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<GeoResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);

  // Route
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(paramRouteId);
  const [selectedRouteTitle, setSelectedRouteTitle] = useState<string | undefined>(paramRouteTitle);
  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  // ── Photos ────────────────────────────────────────────────────────────────

  const pickPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Максимум 5 фото', 'Удалите одно, чтобы добавить другое');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  // ── Place picker ──────────────────────────────────────────────────────────

  const openPlacePicker = () => {
    setPlaceQuery('');
    setPlaceResults([]);
    setShowPlacePicker(true);
  };

  const searchPlace = async (q: string) => {
    setPlaceQuery(q);
    if (q.length < 2) { setPlaceResults([]); return; }
    setPlaceSearching(true);
    try {
      const { data } = await geoApi.search(q);
      setPlaceResults(Array.isArray(data) ? data : []);
    } catch {}
    finally { setPlaceSearching(false); }
  };

  const selectPlace = (r: GeoResult) => {
    setPlace({ name: r.name || r.display_name, lat: r.lat, lon: r.lon });
    setShowPlacePicker(false);
  };

  // ── Route picker ──────────────────────────────────────────────────────────

  const openRoutePicker = async () => {
    setShowRoutePicker(true);
    if (routes.length === 0) {
      setRoutesLoading(true);
      try {
        const { data } = await profileApi.archive();
        setRoutes(data);
      } catch {}
      finally { setRoutesLoading(false); }
    }
  };

  const selectRoute = (r: RouteItem) => {
    setSelectedRouteId(r.id);
    setSelectedRouteTitle(r.title || 'Маршрут');
    setShowRoutePicker(false);
  };

  const clearRoute = () => { setSelectedRouteId(undefined); setSelectedRouteTitle(undefined); };
  const clearPlace = () => setPlace(null);

  // ── Publish ───────────────────────────────────────────────────────────────

  const publish = async () => {
    if (!content.trim() && photos.length === 0) {
      Alert.alert('Пустой пост', 'Напишите что-нибудь или добавьте фото');
      return;
    }
    setPublishing(true);
    try {
      const uploadedKeys: string[] = [];
      for (const uri of photos) {
        const { data } = await uploadsApi.postImage(uri);
        uploadedKeys.push(data.url);
      }
      await postsApi.create(
        content.trim(),
        uploadedKeys[0],
        selectedRouteId,
        uploadedKeys.length > 0 ? uploadedKeys : undefined,
        place?.name,
        place?.lat,
        place?.lon,
      );
      router.back();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.detail || 'Не удалось опубликовать');
    } finally {
      setPublishing(false);
    }
  };

  const canPublish = (content.trim().length > 0 || photos.length > 0) && !publishing;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <CloseIcon color={c.text1} />
          </TouchableOpacity>
          <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Новый пост</Text>
          <TouchableOpacity
            style={[
              styles.publishBtn,
              { backgroundColor: canPublish ? c.text1 : c.surface2 },
            ]}
            onPress={publish}
            disabled={!canPublish}
          >
            {publishing
              ? <ActivityIndicator color={canPublish ? c.bg : c.text3} size="small" />
              : <Text style={[Typography.cap, { color: canPublish ? c.bg : c.text3, fontFamily: 'Manrope_700Bold' }]}>
                  Опубликовать
                </Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Author */}
          <View style={styles.identity}>
            <Avatar size={42} name={user?.nickname} uri={proxyUrl(user?.avatar_url)} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[Typography.bodyStrong, { color: c.text1 }]}>
                {user?.full_name || user?.nickname}
              </Text>
              <Text style={[Typography.micro, { color: c.text3 }]}>Видят все</Text>
            </View>
          </View>

          {/* Text input */}
          <TextInput
            style={[styles.textArea, { color: c.text1, fontFamily: 'Manrope_400Regular' }]}
            placeholder="Что нового?"
            placeholderTextColor={c.text3}
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
            maxLength={2000}
          />

          {/* Char count */}
          {content.length > 1800 && (
            <Text style={[Typography.micro, { color: content.length > 1950 ? c.danger : c.text3, textAlign: 'right', paddingHorizontal: Spacing.screen, marginTop: 4 }]}>
              {content.length}/2000
            </Text>
          )}

          {/* Photos strip */}
          {photos.length > 0 && (
            <View style={{ paddingHorizontal: Spacing.screen, marginTop: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {photos.map((uri, i) => (
                  <View key={i} style={styles.photoThumb}>
                    <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    {i === 0 && (
                      <View style={[styles.coverLabel, { backgroundColor: c.accent }]}>
                        <Text style={[Typography.micro, { color: '#fff' }]}>Обложка</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(i)}>
                      <XSmallIcon color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 5 && (
                  <TouchableOpacity
                    style={[styles.addPhotoBtn, { backgroundColor: c.surface2, borderColor: c.border2 }]}
                    onPress={pickPhoto}
                  >
                    <ImageIcon color={c.text3} />
                    <Text style={[Typography.micro, { color: c.text3, marginTop: 6 }]}>
                      {5 - photos.length} ещё
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          )}

          {/* Attached place */}
          {place && (
            <View style={[styles.badge, { backgroundColor: c.surface, borderColor: c.border, marginTop: 10 }]}>
              <MapPinIcon color="#E74C3C" />
              <Text style={[Typography.cap, { color: c.text1, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
                {place.name}
              </Text>
              <TouchableOpacity onPress={clearPlace} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <XSmallIcon color={c.text3} />
              </TouchableOpacity>
            </View>
          )}

          {/* Attached route */}
          {selectedRouteTitle && (
            <View style={[styles.badge, { backgroundColor: c.surface, borderColor: c.border, marginTop: place ? 6 : 10 }]}>
              <RouteIcon color={c.accent} />
              <Text style={[Typography.cap, { color: c.text1, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
                {selectedRouteTitle}
              </Text>
              <TouchableOpacity onPress={clearRoute} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <XSmallIcon color={c.text3} />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Toolbar */}
        <View style={[styles.toolbar, { borderTopColor: c.border, backgroundColor: c.bg }]}>
          <TouchableOpacity style={styles.toolBtn} onPress={pickPhoto} disabled={photos.length >= 5}>
            <ImageIcon color={photos.length >= 5 ? c.text3 : c.text2} />
            <Text style={[Typography.cap, { color: photos.length >= 5 ? c.text3 : c.text2, marginLeft: 7 }]}>
              Фото {photos.length > 0 ? `(${photos.length}/5)` : ''}
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <TouchableOpacity style={styles.toolBtn} onPress={openPlacePicker}>
            <MapPinIcon color={place ? '#E74C3C' : c.text2} />
            <Text style={[Typography.cap, { color: place ? '#E74C3C' : c.text2, marginLeft: 7 }]}>
              {place ? 'Место ✓' : 'Место'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <TouchableOpacity style={styles.toolBtn} onPress={openRoutePicker}>
            <RouteIcon color={selectedRouteTitle ? c.accent : c.text2} />
            <Text style={[Typography.cap, { color: selectedRouteTitle ? c.accent : c.text2, marginLeft: 7 }]}>
              {selectedRouteTitle ? 'Маршрут ✓' : 'Маршрут'}
            </Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>

      {/* ── Place picker modal ─────────────────────────────────────────────── */}
      <Modal visible={showPlacePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPlacePicker(false)}>
        <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setShowPlacePicker(false)}>
              <BackIcon color={c.text1} />
            </TouchableOpacity>
            <Text style={[Typography.bodyStrong, { color: c.text1, flex: 1, textAlign: 'center' }]}>
              Добавить место
            </Text>
            <View style={{ width: 30 }} />
          </View>

          <View style={[styles.searchRow, { borderBottomColor: c.border }]}>
            <SearchIcon color={c.text3} />
            <TextInput
              style={[Typography.body, { flex: 1, color: c.text1, marginLeft: 10, paddingVertical: 0, fontFamily: 'Manrope_400Regular' }]}
              placeholder="Поиск места..."
              placeholderTextColor={c.text3}
              value={placeQuery}
              onChangeText={searchPlace}
              autoFocus
              returnKeyType="search"
            />
            {placeSearching && <ActivityIndicator size="small" color={c.text3} />}
          </View>

          <FlatList
            data={placeResults}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: Spacing.screen, gap: 2 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.placeItem, { borderBottomColor: c.border }]}
                onPress={() => selectPlace(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.placeIcon, { backgroundColor: '#E74C3C18' }]}>
                  <MapPinIcon color="#E74C3C" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[Typography.bodyStrong, { color: c.text1 }]} numberOfLines={1}>
                    {item.name || item.display_name.split(',')[0]}
                  </Text>
                  <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              placeQuery.length > 1 && !placeSearching ? (
                <View style={styles.emptyWrap}>
                  <Text style={[Typography.body, { color: c.text3, textAlign: 'center' }]}>
                    Ничего не найдено
                  </Text>
                </View>
              ) : placeQuery.length <= 1 ? (
                <View style={styles.emptyWrap}>
                  <Text style={[Typography.cap, { color: c.text3, textAlign: 'center' }]}>
                    Введите название места или адрес
                  </Text>
                </View>
              ) : null
            }
          />
        </SafeAreaView>
      </Modal>

      {/* ── Route picker modal ─────────────────────────────────────────────── */}
      <Modal visible={showRoutePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRoutePicker(false)}>
        <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setShowRoutePicker(false)}>
              <BackIcon color={c.text1} />
            </TouchableOpacity>
            <Text style={[Typography.bodyStrong, { color: c.text1, flex: 1, textAlign: 'center' }]}>
              Прикрепить маршрут
            </Text>
            <View style={{ width: 30 }} />
          </View>

          {routesLoading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : (
            <FlatList
              data={routes}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ padding: Spacing.screen, gap: 2 }}
              renderItem={({ item }) => {
                const distKm = ((item.distance_m ?? 0) / 1000).toFixed(1);
                const isSelected = item.id === selectedRouteId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.routeItem,
                      {
                        backgroundColor: isSelected ? c.accent + '15' : c.surface,
                        borderColor: isSelected ? c.accent : 'transparent',
                      },
                    ]}
                    onPress={() => selectRoute(item)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.routeIconWrap, { backgroundColor: c.accentSoft }]}>
                      <RouteIcon color={c.accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[Typography.bodyStrong, { color: c.text1 }]} numberOfLines={1}>
                        {item.title || 'Маршрут'}
                      </Text>
                      <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>
                        {distKm} км · {item.duration_min ?? '?'} мин
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: c.accent }]}>
                        <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <RouteIcon color={c.text3} />
                  <Text style={[Typography.body, { color: c.text3, marginTop: 12, textAlign: 'center' }]}>
                    Нет сохранённых маршрутов.{'\n'}Создайте первый на вкладке «Карта»
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen, paddingVertical: 12, borderBottomWidth: 1,
  },
  publishBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, minWidth: 110, alignItems: 'center',
  },
  identity: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingVertical: 16,
  },
  textArea: {
    paddingHorizontal: Spacing.screen, fontSize: 16, lineHeight: 24,
    textAlignVertical: 'top', minHeight: 120,
  },
  photoThumb: {
    width: 88, height: 88, borderRadius: 10, overflow: 'hidden', position: 'relative',
  },
  coverLabel: {
    position: 'absolute', bottom: 5, left: 5,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  removePhoto: {
    position: 'absolute', top: 5, right: 5,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 88, height: 88, borderRadius: 10, borderWidth: 1,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.screen, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.md, borderWidth: 1,
  },
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingVertical: 12, borderTopWidth: 1,
  },
  toolBtn: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  divider: { width: 1, height: 20, marginHorizontal: 4 },

  // Modals
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1,
  },
  placeItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  placeIcon: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  routeItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.card, borderWidth: 1, marginBottom: 8,
  },
  routeIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  checkBadge: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 60 },
});
