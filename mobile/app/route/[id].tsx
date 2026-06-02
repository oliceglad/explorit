import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker } from '@/components/ui/Map';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { routesApi } from '@/services/api';

interface RoutePoint { order: number; poi_id?: string; lat: number; lon: number; name: string; }
interface Route {
  id: string; title?: string; description?: string;
  points: RoutePoint[]; distance_m?: number; duration_min?: number;
  transport_mode: string; is_public: boolean; is_saved: boolean; invite_link?: string;
}

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

  const coords = route.points.map((p) => ({ latitude: p.lat, longitude: p.lon }));
  const region = coords.length > 0 ? {
    latitude: coords.reduce((s, c) => s + c.latitude, 0) / coords.length,
    longitude: coords.reduce((s, c) => s + c.longitude, 0) / coords.length,
    latitudeDelta: 0.04, longitudeDelta: 0.04,
  } : undefined;

  const distKm = ((route.distance_m ?? 0) / 1000).toFixed(1);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView style={styles.map} initialRegion={region}>
        {coords.length > 1 && (
          <>
            <Polyline coordinates={coords} strokeColor={c.accent} strokeWidth={5} lineCap="round" />
            <Polyline coordinates={coords} strokeColor={c.accent} strokeWidth={9} lineCap="round"
              strokeColors={[`${c.accent}30`]} />
          </>
        )}
        {route.points.map((p, i) => (
          <Marker key={p.order} coordinate={{ latitude: p.lat, longitude: p.lon }}
            title={p.name} pinColor={i === 0 ? c.info : c.accent} />
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
            <Text style={[Typography.bodyStrong, { color: c.text1 }]}>🎲 Ещё раз</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Bottom sheet */}
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
            <View style={[styles.pointNum, { backgroundColor: c.accentSoft }]}>
              <Text style={[Typography.cap, { color: c.accentStrong }]}>{i + 1}</Text>
            </View>
            <Text style={[Typography.bodyStrong, { color: c.text1, flex: 1, marginLeft: 10 }]}>{p.name}</Text>
          </View>
        ))}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.iconAction, { borderColor: c.border2 }]} onPress={handleShare}>
            <Text style={{ fontSize: 20 }}>👥</Text>
          </TouchableOpacity>
          {!route.is_saved && (
            <TouchableOpacity style={[styles.iconAction, { borderColor: c.border2 }]} onPress={handleSave}>
              <Text style={{ fontSize: 20 }}>{saving ? '...' : '🔖'}</Text>
            </TouchableOpacity>
          )}
          <Button label="▶ Начать" size="lg" style={{ flex: 1, marginLeft: 8 }}
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
  sheet: { borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet, padding: Spacing.screen, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 28 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingVertical: 14, backgroundColor: 'transparent' },
  stat: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 32 },
  pointRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  pointNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
  iconAction: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
