import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { Typography, Spacing, Radius } from "@/constants/typography";
import { routesApi } from "@/services/api";
import Svg, { Path, Circle } from "react-native-svg";

const TABS = ["Для тебя", "Рядом", "Топ недели", "Короткие", "Семейные"];

interface Route {
  id: string;
  title?: string;
  distance_m?: number;
  duration_min?: number;
  transport_mode: string;
  is_public: boolean;
  created_at: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={10} cy={10} r={6} stroke={color} strokeWidth={1.75} />
      <Path
        d="M15 15l4.5 4.5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function RouteThumbIcon({ color, accent }: { color: string; accent: string }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 17c0-3.5 2-5.5 5-5.5S17 9 17 5.5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Circle cx={7} cy={17} r={2.5} fill={accent} />
      <Circle cx={17} cy={5.5} r={2.5} fill={accent} />
    </Svg>
  );
}

function ChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EmptyIcon({ color, accent }: { color: string; accent: string }) {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 17c0-3.5 2-5.5 5-5.5S17 9 17 5.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeOpacity={0.45}
      />
      <Circle cx={7} cy={17} r={2.5} fill={accent} fillOpacity={0.5} />
      <Circle cx={17} cy={5.5} r={2.5} fill={accent} fillOpacity={0.5} />
    </Svg>
  );
}

// ─── Route card ───────────────────────────────────────────────────────────────

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
        <RouteThumbIcon color={c.text2} accent={c.accent} />
      </View>
      <View style={{ flex: 1, paddingLeft: 12 }}>
        <Text
          style={[Typography.bodyStrong, { color: c.text1 }]}
          numberOfLines={1}
        >
          {route.title || "Маршрут"}
        </Text>
        <Text style={[Typography.cap, { color: c.text2, marginTop: 3 }]}>
          {distKm} км · {route.duration_min ?? "?"} мин ·{" "}
          {route.transport_mode === "walking" ? "Пешком" : "Авто"}
        </Text>
      </View>
      <ChevronIcon color={c.text3} />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RoutesScreen() {
  const c = useTheme();
  const router = useRouter();

  const [tab, setTab] = useState(0);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    try {
      const { data } = await routesApi.catalog();
      setRoutes(data);
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return routes;
    const q = query.toLowerCase();
    return routes.filter((r) => (r.title ?? "").toLowerCase().includes(q));
  }, [routes, query]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Text style={[Typography.capUp, { color: c.text3 }]}>Маршруты</Text>
        <Text style={[Typography.h1, { color: c.text1, marginTop: 2 }]}>
          Куда сегодня?
        </Text>
      </View>

      {/* Search */}
      <View
        style={[
          styles.search,
          { backgroundColor: c.surface2, borderRadius: Radius.md },
        ]}
      >
        <SearchIcon color={c.text3} />
        <TextInput
          style={[Typography.body, styles.searchInput, { color: c.text1 }]}
          placeholder="Найти маршрут"
          placeholderTextColor={c.text3}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(i)}
            style={[
              styles.tab,
              { backgroundColor: tab === i ? c.text1 : c.surface2 },
            ]}
          >
            <Text
              style={[Typography.cap, { color: tab === i ? c.bg : c.text2 }]}
              numberOfLines={1}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: Spacing.screen, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <RouteCard
            route={item}
            onPress={() => router.push(`/route/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyIcon color={c.text3} accent={c.accent} />
            <Text
              style={[
                Typography.body,
                { color: c.text3, marginTop: 16, textAlign: "center" },
              ]}
            >
              {query.trim()
                ? "Ничего не найдено"
                : "Маршрутов пока нет.\nСгенерируй первый на карте!"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.screen,
    paddingTop: 8,
    paddingBottom: 12,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    marginHorizontal: Spacing.screen,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 10, paddingVertical: 0 },
  tabs: { maxHeight: 32, marginBottom: 8 },
  tabsContent: { paddingHorizontal: Spacing.screen, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: Radius.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  routeThumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingTop: 80 },
});
