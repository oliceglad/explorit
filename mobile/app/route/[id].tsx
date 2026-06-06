import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import MapView, { Polyline, Marker } from '@/components/ui/Map';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { routesApi } from '@/services/api';

const SURPRISE_COLOR = '#7C3AED';

interface RoutePoint { order: number; poi_id?: string; lat: number; lon: number; name: string; is_surprise?: boolean; }
interface Route {
  id: string; title?: string; description?: string;
  points: RoutePoint[];
  polyline?: [number, number][];
  distance_m?: number; duration_min?: number;
  transport_mode: string; is_public: boolean; is_saved: boolean; invite_link?: string;
}

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


export default function RouteDetail() {
  const c = useTheme();
  const router = useRouter();
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();

  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    routesApi.get(id).then(({ data }) => setRoute(data)).catch(() => router.back()).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!route) return;
    setSaving(true);
    try { await routesApi.save(route.id); setRoute((r) => r ? { ...r, is_saved: true } : r); }
    catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
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

  if (loading) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator />
    </SafeAreaView>
  );

  if (!route) return null;

  // Prefer road polyline if available, otherwise fall back to point-to-point
  const roadCoords: { latitude: number; longitude: number }[] = route.polyline
    ? route.polyline.map(([lat, lon]) => ({ latitude: lat, longitude: lon }))
    : route.points.map((p) => ({ latitude: p.lat, longitude: p.lon }));

  const markerCoords = route.points.map((p) => ({ latitude: p.lat, longitude: p.lon }));
  const allCoords = roadCoords.length > 0 ? roadCoords : markerCoords;

  const region = allCoords.length > 0 ? {
    latitude: allCoords.reduce((s, c) => s + c.latitude, 0) / allCoords.length,
    longitude: allCoords.reduce((s, c) => s + c.longitude, 0) / allCoords.length,
    latitudeDelta: 0.04, longitudeDelta: 0.04,
  } : undefined;

  const distKm = ((route.distance_m ?? 0) / 1000).toFixed(1);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView style={styles.map} initialRegion={region}>
        {roadCoords.length > 1 && (
          <>
            <Polyline coordinates={roadCoords} strokeColor={`${c.accent}30`} strokeWidth={9} lineCap="round" />
            <Polyline coordinates={roadCoords} strokeColor={c.accent} strokeWidth={5} lineCap="round" />
          </>
        )}
        {route.points.map((p, i) => (
          <Marker key={p.order} coordinate={{ latitude: p.lat, longitude: p.lon }}
            title={p.name}
            pinColor={p.is_surprise ? SURPRISE_COLOR : (i === 0 ? c.info : c.accent)} />
        ))}
      </MapView>

      {/* Top buttons */}
      <SafeAreaView style={styles.topBtns}>
        <TouchableOpacity style={[styles.pillBtn, { backgroundColor: c.surface }]} onPress={() => router.back()}>
          <Text style={[Typography.bodyStrong, { color: c.text1 }]}>← Назад</Text>
        </TouchableOpacity>
        {preview && (
          <TouchableOpacity style={[styles.pillBtn, { backgroundColor: c.surface }]}
            onPress={() => router.replace('/(tabs)/map')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconRefresh color={c.text1} />
              <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Ещё раз</Text>
            </View>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Bottom sheet — no top rounded corners */}
      <View style={[styles.sheet, { backgroundColor: c.surface }]}>
        <View style={[styles.grabber, { backgroundColor: c.border2 }]} />

        <View style={styles.chips}>
          {route.is_saved && (
            <View style={[styles.chip, { backgroundColor: c.accentSoft }]}>
              <Text style={[Typography.cap, { color: c.accentStrong }]}>✓ Сохранён</Text>
            </View>
          )}
        </View>

        <Text style={[Typography.h1, { color: c.text1, marginTop: 8 }]}>
          {route.title || 'Сгенерированный маршрут'}
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Дистанция', value: `${distKm} км` },
            { label: 'Время', value: `${route.duration_min ?? '?'} мин` },
            { label: 'Точек', value: `${route.points.length}` },
          ].map(({ label, value }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
              <View style={styles.stat}>
                <Text style={[Typography.h3, { color: c.text1 }]}>{value}</Text>
                <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Points list */}
        {route.points.slice(0, 3).map((p, i) => (
          <View key={p.order} style={styles.pointRow}>
            <View style={[styles.pointNum, {
              backgroundColor: p.is_surprise ? `${SURPRISE_COLOR}20` : c.accentSoft,
            }]}>
              <Text style={[Typography.cap, { color: p.is_surprise ? SURPRISE_COLOR : c.accentStrong }]}>{i + 1}</Text>
            </View>
            <Text style={[Typography.bodyStrong, { color: c.text1, flex: 1, marginLeft: 10 }]}>{p.name}</Text>
            {p.is_surprise && (
              <View style={styles.surpriseBadge}>
                <Text style={styles.surpriseBadgeText}>сюрприз</Text>
              </View>
            )}
          </View>
        ))}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.iconAction, { borderColor: c.border2 }]} onPress={handleShare}>
            <IconShare color={c.text1} />
          </TouchableOpacity>
          {!route.is_saved && (
            <TouchableOpacity style={[styles.iconAction, { borderColor: c.border2 }]} onPress={handleSave} disabled={saving}>
              <IconBookmark color={saving ? c.text3 : c.text1} filled={false} />
            </TouchableOpacity>
          )}
          <Button label="Начать" size="lg" style={{ flex: 1, marginLeft: 8 }}
            onPress={() => Alert.alert('В разработке', 'Навигация будет в следующей версии')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  map: { flex: 1 },
  topBtns: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.screen, zIndex: 3 },
  pillBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  sheet: { padding: Spacing.screen, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 28 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 32 },
  pointRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  pointNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
  iconAction: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  surpriseBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: `${SURPRISE_COLOR}18`, marginLeft: 8 },
  surpriseBadgeText: { fontSize: 10, fontWeight: '600', color: SURPRISE_COLOR, textTransform: 'lowercase' },
});
