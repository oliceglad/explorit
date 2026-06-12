import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Modal, Linking, Image, Dimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import MapView, { Polyline, Marker } from '@/components/ui/Map';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { routesApi, poiApi } from '@/services/api';

const SURPRISE_COLOR = '#7C3AED';
const START_COLOR = '#16A34A';
const END_COLOR = '#DC2626';
const GOOGLE_COLOR = '#4285F4';
const GIS_COLOR = '#1A73A7';

const CATEGORY_COLORS: Record<string, string> = {
  'Кафе': '#E74C3C', 'Рестораны': '#C0392B', 'Парки': '#27AE60',
  'Виды': '#3498DB', 'Архитектура': '#9B59B6', 'Музыка': '#E67E22',
  'Музеи': '#16A085', 'Галереи': '#8E44AD', 'Арт': '#E91E63',
  'Рынки': '#F39C12', 'Спорт': '#2ECC71', 'Театры': '#D35400',
  'Фото': '#1ABC9C', 'История': '#95A5A6',
};
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.52;

interface RoutePoint {
  order: number; poi_id?: string;
  lat: number; lon: number; name: string;
  is_surprise?: boolean; category?: string | null;
}

interface POIDetail {
  photo_url?: string | null; address?: string | null;
  description?: string | null; rating?: number | null;
  category?: string | null;
}

interface Route {
  id: string; title?: string; description?: string;
  points: RoutePoint[]; polyline?: [number, number][];
  distance_m?: number; duration_min?: number;
  transport_mode: string; is_public: boolean; is_saved: boolean; invite_link?: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconRefresh = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M1 4v6h6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3.51 15a9 9 0 1 0 .49-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconShare = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth={2} />
    <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth={2} />
    <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={2} />
    <Path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const IconBookmark = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconChevronUp = ({ color }: { color: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M18 15l-6-6-6 6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconChevronDown = ({ color }: { color: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconFocus = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPerson = ({ color }: { color: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
    <Path d="M4 21v-1a8 8 0 0 1 16 0v1" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const IconLocate = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    <Circle cx="12" cy="12" r="7" stroke={color} strokeWidth={1.75} />
    <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth={1.75} />
  </Svg>
);

const IconMapBig = ({ color }: { color: string }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z"
      stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    <Circle cx="12" cy="8" r="2.5" stroke={color} strokeWidth={1.5} />
  </Svg>
);

const IconPin = ({ color, size = 14 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z"
      stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Circle cx="12" cy="8" r="2" stroke={color} strokeWidth={1.75} />
  </Svg>
);

const IconStar = ({ color }: { color: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const IconGoogleMap = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z"
      stroke={GOOGLE_COLOR} strokeWidth={1.75} strokeLinejoin="round" fill={`${GOOGLE_COLOR}20`} />
    <Circle cx="12" cy="8" r="2.5" fill={GOOGLE_COLOR} />
  </Svg>
);

const IconGlobe = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={GIS_COLOR} strokeWidth={1.75} />
    <Path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
      stroke={GIS_COLOR} strokeWidth={1.75} />
  </Svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function markerColor(i: number, total: number, p: RoutePoint, accent: string): string {
  if (p.is_surprise) return SURPRISE_COLOR;
  if (i === 0) return START_COLOR;
  if (i === total - 1) return END_COLOR;
  return accent;
}

function markerLabel(i: number, total: number): string {
  if (i === 0) return '▶';
  if (i === total - 1) return '■';
  return String(i + 1);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RouteDetail() {
  const c = useTheme();
  const router = useRouter();
  const { id, preview, originLat, originLon } = useLocalSearchParams<{
    id: string; preview?: string; originLat?: string; originLon?: string;
  }>();

  const origin = originLat && originLon
    ? { latitude: parseFloat(originLat), longitude: parseFloat(originLon) }
    : null;
  const mapRef = useRef<any>(null);

  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [selected, setSelected] = useState<RoutePoint | null>(null);
  const [poiDetail, setPoiDetail] = useState<POIDetail | null>(null);
  const [poiLoading, setPoiLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    routesApi.get(id)
      .then(({ data }) => {
        setRoute(data);
        setPoints([...data.points].sort((a, b) => a.order - b.order));
      })
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch { /* геолокация недоступна */ }
    })();
  }, []);

  const handleSave = async () => {
    if (!route) return;
    setSaving(true);
    try {
      await routesApi.save(route.id);
      setRoute(r => r ? { ...r, is_saved: true } : r);
    } catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
    finally { setSaving(false); }
  };

  const handleShare = async () => {
    if (!route) return;
    try {
      const { data } = await routesApi.share(route.id);
      Alert.alert('Код приглашения', data.invite_link, [
        { text: 'Начать вместе', onPress: () => router.push(`/coop/${data.invite_link}`) },
        { text: 'ОК' },
      ]);
    } catch { Alert.alert('Ошибка', 'Не удалось получить ссылку'); }
  };

  const movePoint = (idx: number, dir: 'up' | 'down') => {
    setPoints(prev => {
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const selectPoint = async (point: RoutePoint) => {
    setSelected(point);
    setPoiDetail(null);
    mapRef.current?.animateToRegion({
      latitude: point.lat, longitude: point.lon,
      latitudeDelta: 0.008, longitudeDelta: 0.008,
    }, 500);
    if (point.poi_id) {
      setPoiLoading(true);
      try {
        const { data } = await poiApi.get(point.poi_id);
        setPoiDetail(data);
      } catch { /* no detail */ }
      finally { setPoiLoading(false); }
    }
  };

  const focusRoute = () => {
    if (!mapRef.current || allCoords.length === 0) return;
    mapRef.current.fitToCoordinates(allCoordsWithOrigin, {
      edgePadding: { top: 100, right: 48, bottom: SHEET_H + 40, left: 48 },
      animated: true,
    });
  };

  if (loading) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <ActivityIndicator style={{ flex: 1 }} color={c.accent} />
    </SafeAreaView>
  );

  if (!route) return null;

  const roadCoords: { latitude: number; longitude: number }[] = route.polyline
    ? route.polyline.map(([lat, lon]) => ({ latitude: lat, longitude: lon }))
    : points.map(p => ({ latitude: p.lat, longitude: p.lon }));

  const allCoords = roadCoords.length > 0 ? roadCoords : points.map(p => ({ latitude: p.lat, longitude: p.lon }));
  const allCoordsWithOrigin = origin ? [...allCoords, origin] : allCoords;

  const region = allCoordsWithOrigin.length > 0 ? {
    latitude: allCoordsWithOrigin.reduce((s, p) => s + p.latitude, 0) / allCoordsWithOrigin.length,
    longitude: allCoordsWithOrigin.reduce((s, p) => s + p.longitude, 0) / allCoordsWithOrigin.length,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  } : undefined;

  const distKm = ((route.distance_m ?? 0) / 1000).toFixed(1);
  const total = points.length;

  const selectedIndex = selected ? points.findIndex(p => p.order === selected.order) : -1;
  const selectedColor = selected ? markerColor(selectedIndex, total, selected, c.accent) : c.accent;

  return (
    <View style={styles.root}>
      {/* ── Map ── */}
      <MapView ref={mapRef} style={styles.map} initialRegion={region}
        showsUserLocation showsMyLocationButton={false}
      >
        {roadCoords.length > 1 && (
          <>
            <Polyline coordinates={roadCoords} strokeColor={`${c.accent}30`} strokeWidth={10} lineCap="round" />
            <Polyline coordinates={roadCoords} strokeColor={c.accent} strokeWidth={5} lineCap="round" />
          </>
        )}
        {points.map((p, i) => {
          const col = markerColor(i, total, p, c.accent);
          const isSelected = selected?.order === p.order;
          return (
            <Marker
              key={`m-${p.order}`}
              coordinate={{ latitude: p.lat, longitude: p.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              onPress={() => selectPoint(p)}
            >
              <View style={[
                styles.pin,
                { backgroundColor: col, width: isSelected ? 40 : 32, height: isSelected ? 40 : 32, borderRadius: isSelected ? 20 : 16 },
              ]}>
                <Text style={[styles.pinText, { fontSize: isSelected ? 14 : 12 }]}>
                  {markerLabel(i, total)}
                </Text>
              </View>
            </Marker>
          );
        })}

        {/* ── Origin "Вы здесь" marker ── */}
        {origin && (
          <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.originOuter}>
              <View style={[styles.originInner, { backgroundColor: c.info ?? '#3B82F6' }]}>
                <IconPerson color="#fff" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── Top bar ── */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity style={[styles.pill, { backgroundColor: c.surface }]} onPress={() => router.back()}>
          <Text style={[Typography.bodyStrong, { color: c.text1 }]}>← Назад</Text>
        </TouchableOpacity>
        {preview && (
          <TouchableOpacity style={[styles.pill, { backgroundColor: c.surface }]}
            onPress={() => router.replace('/(tabs)/map')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconRefresh color={c.text1} />
              <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Ещё раз</Text>
            </View>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* ── Map control buttons ── */}
      <View style={[styles.mapBtns, { bottom: SHEET_H + 12 }]}>
        {userLocation && (
          <TouchableOpacity
            style={[styles.mapBtn, { backgroundColor: c.surface }]}
            onPress={() => mapRef.current?.animateToRegion({
              ...userLocation, latitudeDelta: 0.01, longitudeDelta: 0.01,
            }, 400)}
          >
            <IconLocate color={c.accent} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.mapBtn, { backgroundColor: c.surface }]}
          onPress={focusRoute}
        >
          <IconFocus color={c.text1} />
        </TouchableOpacity>
      </View>

      {/* ── Bottom sheet ── */}
      <View style={[styles.sheet, { backgroundColor: c.surface, height: SHEET_H }]}>
        <View style={[styles.grabber, { backgroundColor: c.border2 }]} />

        {/* Header + stats – not scrollable */}
        <View style={styles.sheetHead}>
          <View style={styles.chips}>
            {route.is_saved && (
              <View style={[styles.chip, { backgroundColor: c.accentSoft }]}>
                <Text style={[Typography.cap, { color: c.accentStrong }]}>✓ Сохранён</Text>
              </View>
            )}
            <View style={[styles.chip, { backgroundColor: `${START_COLOR}18` }]}>
              <Text style={[Typography.cap, { color: START_COLOR }]}>Нажмите точку для деталей</Text>
            </View>
          </View>

          <Text style={[Typography.h2, { color: c.text1, marginTop: 8 }]}>
            {route.title || 'Маршрут'}
          </Text>
          {route.description ? (
            <Text style={[Typography.body, { color: c.text2, marginTop: 3 }]} numberOfLines={1}>
              {route.description}
            </Text>
          ) : null}

          <View style={[styles.statsRow, { borderTopColor: c.border, borderBottomColor: c.border }]}>
            {[
              { label: 'Дистанция', value: `${distKm} км` },
              { label: 'Время', value: `${route.duration_min ?? '?'} мин` },
              { label: 'Точек', value: `${total}` },
            ].map(({ label, value }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <View style={[styles.vDivider, { backgroundColor: c.border }]} />}
                <View style={styles.stat}>
                  <Text style={[Typography.h3, { color: c.text1 }]}>{value}</Text>
                  <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>{label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Points list – scrollable */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {points.map((p, i) => {
            const col = markerColor(i, total, p, c.accent);
            const isSelected = selected?.order === p.order;
            return (
              <TouchableOpacity
                key={`row-${p.order}`}
                onPress={() => selectPoint(p)}
                activeOpacity={0.7}
                style={[
                  styles.pointRow,
                  { borderColor: isSelected ? col : 'transparent', borderWidth: 1, borderRadius: Radius.md },
                  isSelected && { backgroundColor: `${col}0C` },
                ]}
              >
                {/* Number badge */}
                <View style={[styles.badge, { backgroundColor: `${col}20` }]}>
                  <Text style={[Typography.cap, { color: col, fontWeight: '700' }]}>{i + 1}</Text>
                </View>

                {/* Name + labels */}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={styles.labelRow}>
                    {i === 0 && (
                      <View style={[styles.label, { backgroundColor: `${START_COLOR}18` }]}>
                        <Text style={[styles.labelText, { color: START_COLOR }]}>СТАРТ</Text>
                      </View>
                    )}
                    {i === total - 1 && total > 1 && (
                      <View style={[styles.label, { backgroundColor: `${END_COLOR}18` }]}>
                        <Text style={[styles.labelText, { color: END_COLOR }]}>ФИНИШ</Text>
                      </View>
                    )}
                    {p.is_surprise && (
                      <View style={[styles.label, { backgroundColor: `${SURPRISE_COLOR}18` }]}>
                        <Text style={[styles.labelText, { color: SURPRISE_COLOR }]}>СЮРПРИЗ ✦</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[Typography.bodyStrong, { color: c.text1, marginTop: 2 }]}>{p.name}</Text>
                  {p.category && !p.is_surprise && (() => {
                    const col = CATEGORY_COLORS[p.category] ?? c.accent;
                    return (
                      <View style={styles.catPill}>
                        <View style={[styles.catPillDot, { backgroundColor: col }]} />
                        <Text style={[Typography.micro, { color: col }]}>{p.category}</Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Reorder */}
                <View style={styles.reorderCol}>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
                    style={{ opacity: i === 0 ? 0.2 : 1 }}
                    onPress={() => movePoint(i, 'up')} disabled={i === 0}
                  >
                    <IconChevronUp color={c.text2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
                    style={{ opacity: i === total - 1 ? 0.2 : 1 }}
                    onPress={() => movePoint(i, 'down')} disabled={i === total - 1}
                  >
                    <IconChevronDown color={c.text2} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Actions – fixed bottom */}
        <View style={[styles.actions, { borderTopColor: c.border }]}>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: c.border2 }]} onPress={handleShare}>
            <IconShare color={c.text1} />
          </TouchableOpacity>
          {!route.is_saved && (
            <TouchableOpacity style={[styles.iconBtn, { borderColor: c.border2 }]} onPress={handleSave} disabled={saving}>
              <IconBookmark color={saving ? c.text3 : c.text1} />
            </TouchableOpacity>
          )}
          <Button label="Начать" size="lg" style={{ flex: 1, marginLeft: 8 }}
            onPress={() => Alert.alert('В разработке', 'Навигация будет в следующей версии')} />
        </View>
      </View>

      {/* ── Point detail modal ── */}
      <Modal
        visible={selected !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />

          <View style={[styles.detailSheet, { backgroundColor: c.surface }]}>
            {/* Photo */}
            <View style={styles.photoWrap}>
              {poiLoading ? (
                <View style={[styles.photoPlaceholder, { backgroundColor: c.border }]}>
                  <ActivityIndicator color={c.accent} />
                </View>
              ) : poiDetail?.photo_url ? (
                <Image source={{ uri: poiDetail.photo_url }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: `${selectedColor}14` }]}>
                  <IconMapBig color={selectedColor} />
                  <Text style={[Typography.cap, { color: c.text3, marginTop: 8 }]}>Фото недоступно</Text>
                </View>
              )}

              {/* Number overlay on photo */}
              {selected && (
                <View style={[styles.photoNum, { backgroundColor: selectedColor }]}>
                  <Text style={styles.photoNumText}>{selectedIndex + 1}</Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.detailContent}>
              <View style={styles.detailTitleRow}>
                {selectedIndex === 0 && (
                  <View style={[styles.label, { backgroundColor: `${START_COLOR}18`, marginRight: 6 }]}>
                    <Text style={[styles.labelText, { color: START_COLOR }]}>СТАРТ</Text>
                  </View>
                )}
                {selectedIndex === total - 1 && total > 1 && (
                  <View style={[styles.label, { backgroundColor: `${END_COLOR}18`, marginRight: 6 }]}>
                    <Text style={[styles.labelText, { color: END_COLOR }]}>ФИНИШ</Text>
                  </View>
                )}
                {selected?.is_surprise && (
                  <View style={[styles.label, { backgroundColor: `${SURPRISE_COLOR}18`, marginRight: 6 }]}>
                    <Text style={[styles.labelText, { color: SURPRISE_COLOR }]}>СЮРПРИЗ</Text>
                  </View>
                )}
                {selected?.category && !selected?.is_surprise && (() => {
                  const col = CATEGORY_COLORS[selected.category!] ?? c.accent;
                  return (
                    <View style={[styles.detailCatBadge, { backgroundColor: col + '1A', borderColor: col + '40' }]}>
                      <View style={[styles.catPillDot, { backgroundColor: col }]} />
                      <Text style={[Typography.micro, { color: col, marginLeft: 4 }]}>{selected.category}</Text>
                    </View>
                  );
                })()}
                <Text style={[Typography.h2, { color: c.text1, flex: 1 }]} numberOfLines={2}>
                  {selected?.name}
                </Text>
                <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[Typography.h3, { color: c.text3 }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {(!selected?.category || selected?.is_surprise) && (poiDetail?.category) && (() => {
                const col = CATEGORY_COLORS[poiDetail.category!] ?? c.accent;
                return (
                  <View style={[styles.detailCatBadge, { backgroundColor: col + '1A', borderColor: col + '40', marginTop: 4 }]}>
                    <View style={[styles.catPillDot, { backgroundColor: col }]} />
                    <Text style={[Typography.micro, { color: col, marginLeft: 4 }]}>{poiDetail.category}</Text>
                  </View>
                );
              })()}

              {poiDetail?.address ? (
                <View style={[styles.detailRow, { marginTop: 8 }]}>
                  <IconPin color={c.text3} />
                  <Text style={[Typography.body, { color: c.text2, marginLeft: 6, flex: 1 }]}>
                    {poiDetail.address}
                  </Text>
                </View>
              ) : null}

              {poiDetail?.description ? (
                <Text style={[Typography.body, { color: c.text2, marginTop: 6 }]} numberOfLines={3}>
                  {poiDetail.description}
                </Text>
              ) : null}

              {poiDetail?.rating ? (
                <View style={[styles.detailRow, { marginTop: 4 }]}>
                  <IconStar color="#F59E0B" />
                  <Text style={[Typography.cap, { color: c.text3, marginLeft: 5 }]}>
                    {poiDetail.rating.toFixed(1)}
                  </Text>
                </View>
              ) : null}

              {/* Map links */}
              <View style={styles.mapLinks}>
                <TouchableOpacity
                  style={[styles.mapLinkBtn, { backgroundColor: `${GOOGLE_COLOR}12`, borderColor: `${GOOGLE_COLOR}30` }]}
                  onPress={() => selected && Linking.openURL(
                    `https://maps.google.com/?q=${selected.lat},${selected.lon}`
                  )}
                >
                  <IconGoogleMap />
                  <Text style={[Typography.bodyStrong, { color: GOOGLE_COLOR, marginLeft: 7 }]}>Google Maps</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mapLinkBtn, { backgroundColor: `${GIS_COLOR}12`, borderColor: `${GIS_COLOR}30` }]}
                  onPress={() => selected && Linking.openURL(
                    `https://2gis.ru/geo/${selected.lon},${selected.lat}`
                  )}
                >
                  <IconGlobe />
                  <Text style={[Typography.bodyStrong, { color: GIS_COLOR, marginLeft: 7 }]}>2ГИС</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  map: { flex: 1 },

  // Origin marker ("Вы здесь")
  originOuter: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(59,130,246,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(59,130,246,0.35)',
  },
  originInner: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3, elevation: 5,
  },

  // Map pins
  pin: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 6,
  },
  pinText: { color: 'white', fontWeight: '800' },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen, zIndex: 10,
  },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 5, elevation: 5,
  },

  // Map control buttons
  mapBtns: {
    position: 'absolute', right: Spacing.screen,
    gap: 8, zIndex: 10,
  },
  mapBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 5,
  },

  // Bottom sheet
  sheet: {
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08, shadowRadius: 24,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  sheetHead: { paddingHorizontal: Spacing.screen, paddingBottom: 4 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, marginBottom: 4,
    paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1,
  },
  stat: { flex: 1, alignItems: 'center' },
  vDivider: { width: 1, height: 28 },

  // Points list
  listContent: { paddingHorizontal: Spacing.screen, paddingVertical: 6 },
  pointRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 8, marginVertical: 2,
  },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  labelRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  label: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  labelText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  reorderCol: { gap: 2, paddingLeft: 8 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', marginTop: 4,
    alignSelf: 'flex-start',
  },
  catPillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  detailCatBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.pill, borderWidth: 1,
  },

  // Actions
  actions: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingTop: 10,
    paddingBottom: 28, gap: 8, borderTopWidth: 1,
  },
  iconBtn: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  detailSheet: {
    borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet,
    overflow: 'hidden', paddingBottom: 40,
  },
  photoWrap: { height: 210 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoNum: {
    position: 'absolute', top: 14, left: 14,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3, elevation: 5,
  },
  photoNumText: { color: 'white', fontSize: 14, fontWeight: '800' },
  detailContent: { paddingHorizontal: Spacing.screen, paddingTop: 16 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  mapLinks: { flexDirection: 'row', gap: 10, marginTop: 18 },
  mapLinkBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: Radius.md, borderWidth: 1,
  },
});
