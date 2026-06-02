import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, SafeAreaView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { routesApi } from '@/services/api';

const TABS = ['Для тебя', 'Рядом', 'Топ недели', 'Короткие', 'Семейные'];

interface Route {
  id: string;
  title?: string;
  distance_m?: number;
  duration_min?: number;
  transport_mode: string;
  is_public: boolean;
  created_at: string;
}

function RouteCard({ route, onPress }: { route: Route; onPress: () => void }) {
  const c = useTheme();
  const distKm = ((route.distance_m ?? 0) / 1000).toFixed(1);

  return (
    <TouchableOpacity
      style={[styles.routeCard, { backgroundColor: c.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.routeThumb, { backgroundColor: c.surface2 }]}>
        <Text style={{ fontSize: 28 }}>🗺</Text>
      </View>
      <View style={{ flex: 1, paddingLeft: 12 }}>
        <Text style={[Typography.bodyStrong, { color: c.text1 }]} numberOfLines={1}>
          {route.title || 'Маршрут'}
        </Text>
        <Text style={[Typography.cap, { color: c.text2, marginTop: 3 }]}>
          {distKm} км · {route.duration_min ?? '?'} мин · {route.transport_mode === 'walking' ? 'Пешком' : 'Авто'}
        </Text>
      </View>
      <Text style={{ color: c.text3, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

export default function RoutesScreen() {
  const c = useTheme();
  const router = useRouter();

  const [tab, setTab] = useState(0);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await routesApi.catalog();
      setRoutes(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Text style={[Typography.capUp, { color: c.text3 }]}>Маршруты</Text>
        <Text style={[Typography.h1, { color: c.text1, marginTop: 2 }]}>Куда сегодня?</Text>
      </View>

      {/* Search */}
      <View style={[styles.search, { backgroundColor: c.surface2, borderRadius: Radius.md }]}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <Text style={[Typography.body, { color: c.text3, marginLeft: 10 }]}>Найти маршрут</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ paddingHorizontal: Spacing.screen, gap: 8 }}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(i)}
            style={[styles.tab, { backgroundColor: tab === i ? c.text1 : c.surface2, borderRadius: Radius.pill }]}
          >
            <Text style={[Typography.cap, { color: tab === i ? c.bg : c.text2 }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={routes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: Spacing.screen, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <RouteCard route={item} onPress={() => router.push(`/route/${item.id}`)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🗺</Text>
            <Text style={[Typography.body, { color: c.text3, marginTop: 12, textAlign: 'center' }]}>
              Маршрутов пока нет.{'\n'}Сгенерируй первый на карте!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.screen, paddingTop: 8, paddingBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', height: 48, marginHorizontal: Spacing.screen, paddingHorizontal: 16, marginBottom: 12 },
  tabs: { marginBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8 },
  routeCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  routeThumb: { width: 72, height: 72, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
});
