import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, TextInput, FlatList, ActivityIndicator,
  Pressable, PanResponder, Linking, Modal, KeyboardAvoidingView, Platform, Animated,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Circle } from '@/components/ui/Map';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { routesApi, poiApi, geoApi } from '@/services/api';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_H = Dimensions.get('window').height;

const SAMARA = { latitude: 53.1959, longitude: 50.1002, latitudeDelta: 0.05, longitudeDelta: 0.05 };
const MAX_WAYPOINTS = 5;
const THUMB = 22;
const MIN_R = 0.5;
const MAX_R = 10;
const PEEK_HEIGHT = 62;

const CATEGORIES = [
  'Кафе', 'Рестораны', 'Парки', 'Виды', 'Архитектура',
  'Музыка', 'Музеи', 'Галереи', 'Арт', 'Рынки',
  'Спорт', 'Театры', 'Фото', 'История',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Кафе':        '#E74C3C',
  'Рестораны':   '#C0392B',
  'Парки':       '#27AE60',
  'Виды':        '#3498DB',
  'Архитектура': '#9B59B6',
  'Музыка':      '#E67E22',
  'Музеи':       '#16A085',
  'Галереи':     '#8E44AD',
  'Арт':         '#E91E63',
  'Рынки':       '#F39C12',
  'Спорт':       '#2ECC71',
  'Театры':      '#D35400',
  'Фото':        '#1ABC9C',
  'История':     '#95A5A6',
};

const MOOD_PRESETS: Array<{
  label: string; emoji: string;
  categories: string[]; transport: 'walking' | 'driving';
  maxPoints: number; maxDuration: number;
}> = [
  { label: 'Кофе-утро',    emoji: '☕', categories: ['Кафе', 'Парки'],                               transport: 'walking', maxPoints: 3, maxDuration: 60  },
  { label: 'Культура',      emoji: '🏛', categories: ['Музеи', 'Галереи', 'Архитектура', 'История'],  transport: 'walking', maxPoints: 5, maxDuration: 180 },
  { label: 'На природе',    emoji: '🌿', categories: ['Парки', 'Виды', 'Спорт'],                      transport: 'walking', maxPoints: 4, maxDuration: 120 },
  { label: 'Гастротур',     emoji: '🍽', categories: ['Кафе', 'Рестораны', 'Рынки'],                  transport: 'walking', maxPoints: 4, maxDuration: 120 },
  { label: 'Романтика',     emoji: '✨', categories: ['Виды', 'Рестораны', 'Парки'],                   transport: 'walking', maxPoints: 4, maxDuration: 120 },
  { label: 'Арт и стрит',   emoji: '🎨', categories: ['Арт', 'Галереи', 'Музыка'],                    transport: 'walking', maxPoints: 5, maxDuration: 150 },
];

const POINT_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;

const DURATION_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '30 мин', value: 30 },
  { label: '1 час',  value: 60 },
  { label: '2 часа', value: 120 },
  { label: '4 часа', value: 240 },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DEFAULT_INTERESTS: { label: string; categories: string[] }[] = [
  { label: 'Кофе и кафе',           categories: ['Кафе', 'Рестораны'] },
  { label: 'Природа и парки',        categories: ['Парки', 'Спорт'] },
  { label: 'Красивые виды',          categories: ['Виды', 'Фото'] },
  { label: 'История и архитектура',  categories: ['Архитектура', 'История', 'Музеи'] },
  { label: 'Культура и искусство',   categories: ['Музеи', 'Галереи', 'Арт', 'Театры'] },
  { label: 'Музыка и развлечения',   categories: ['Музыка', 'Театры'] },
  { label: 'Рестораны и рынки',      categories: ['Рестораны', 'Рынки', 'Кафе'] },
  { label: 'Всё сразу',              categories: CATEGORIES },
];

const EXAMPLE_PHRASES = [
  'Тихое утро с кофе',
  'Культурный вечер',
  'Активный день на воздухе',
  'Гастрономический тур',
  'Романтическая прогулка',
  'Уличное искусство',
  'Фото в городе',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
}

interface POIMarker {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  opening_hours?: string;
  website?: string;
  phone?: string;
  address?: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={11} cy={11} r={8} stroke={color} strokeWidth={1.75} />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}
function XIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function LocateIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <SvgCircle cx={12} cy={12} r={7} stroke={color} strokeWidth={1.75} />
      <SvgCircle cx={12} cy={12} r={2.5} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}
function MapPinIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      <SvgCircle cx={12} cy={8} r={2} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
function PlusIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function TrashIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function WalkIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={13} cy={4} r={1.5} stroke={color} strokeWidth={1.75} />
      <Path d="M9 8.5l2 1.5v4l-2 4M13 6l2 4-4 2"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CarIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M5 17H3a2 2 0 01-2-2v-4l3-5h14l3 5v4a2 2 0 01-2 2h-2"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <SvgCircle cx={7.5} cy={17} r={2.5} stroke={color} strokeWidth={1.75} />
      <SvgCircle cx={16.5} cy={17} r={2.5} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}
function SparkleIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Svg>
  );
}
function ArrowRightIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function DiceIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <SvgCircle cx={12} cy={12} r={1.5} fill={color} />
      <SvgCircle cx={8.5} cy={10} r={1} fill={color} />
      <SvgCircle cx={15.5} cy={14} r={1} fill={color} />
    </Svg>
  );
}
function SlidersIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}
function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ManualPinIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      <SvgCircle cx={12} cy={8} r={2} stroke={color} strokeWidth={1.5} />
      <Path d="M5 22h14" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M9 18l3 4 3-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CheckCircleIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Path d="M8 12l3 3 5-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function LayersIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ClockIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.75} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}
function PhoneIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.52 12a19.79 19.79 0 01-3.07-8.67A2 2 0 012.44 1.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.63a16 16 0 006.46 6.46l1.51-.78a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}
function GlobeIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.75} />
      <Path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
        stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

// ─── SurpriseToggle ───────────────────────────────────────────────────────────

const SURPRISE_COLOR = '#7C3AED';

function SurpriseToggle({ active, onToggle, theme }: { active: boolean; onToggle: () => void; theme: any }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: active ? `${SURPRISE_COLOR}18` : theme.surface2,
        borderWidth: 1.5,
        borderColor: active ? SURPRISE_COLOR : theme.border,
        borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12,
        marginBottom: 12,
      }}
    >
      <DiceIcon color={active ? SURPRISE_COLOR : theme.text2} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={[Typography.bodyStrong, { color: active ? SURPRISE_COLOR : theme.text1 }]}>
          Удиви меня
        </Text>
        <Text style={[Typography.micro, { color: active ? `${SURPRISE_COLOR}99` : theme.text3, marginTop: 1 }]}>
          Добавить одно необычное место
        </Text>
      </View>
      <View style={{
        width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
        borderColor: active ? SURPRISE_COLOR : theme.border2,
        backgroundColor: active ? SURPRISE_COLOR : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {active && <CheckIcon color="#fff" />}
      </View>
    </TouchableOpacity>
  );
}

// ─── RadiusSlider ─────────────────────────────────────────────────────────────

function RadiusSlider({
  value, onChange, fillColor, trackColor,
}: { value: number; onChange: (v: number) => void; fillColor: string; trackColor: string }) {
  const trackW = useRef(0);
  const pct = (value - MIN_R) / (MAX_R - MIN_R);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const raw = MIN_R + Math.max(0, Math.min(1, e.nativeEvent.locationX / trackW.current)) * (MAX_R - MIN_R);
          onChange(Math.round(raw * 2) / 2);
        },
        onPanResponderMove: (e) => {
          const raw = MIN_R + Math.max(0, Math.min(1, e.nativeEvent.locationX / trackW.current)) * (MAX_R - MIN_R);
          onChange(Math.round(raw * 2) / 2);
        },
      }),
    [onChange],
  );

  return (
    <View
      style={styles.sliderHit}
      onLayout={(e) => { trackW.current = e.nativeEvent.layout.width; }}
      {...pan.panHandlers}
    >
      <View style={[styles.sliderTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.sliderFill, { backgroundColor: fillColor, width: `${pct * 100}%` as any }]} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.sliderThumb,
          { backgroundColor: fillColor, left: `${pct * 100}%` as any, transform: [{ translateX: -(THUMB / 2) }] },
        ]}
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const c = useTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // Map / route state
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(3);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [transport, setTransport] = useState<'walking' | 'driving'>('walking');
  const [loading, setLoading] = useState(false);

  // Interests modal
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [interestsText, setInterestsText] = useState('');
  const [interestsLoading, setInterestsLoading] = useState(false);

  // Search
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<TextInput>(null);

  // Waypoints
  const [waypoints, setWaypoints] = useState<Place[]>([]);
  const [surpriseMe, setSurpriseMe] = useState(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState<Place | null>(null);
  const [addRecommended, setAddRecommended] = useState(false);
  const [recommendedCount, setRecommendedCount] = useState(2);

  // POIs
  const [pois, setPois] = useState<POIMarker[]>([]);
  const [poisLoading, setPoisLoading] = useState(false);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const poisCache = useRef(new Map<string, { pois: POIMarker[]; maxRadius: number }>());
  const shimAnim = useRef(new Animated.Value(0)).current;

  // Selected POI
  const [selectedPoi, setSelectedPoi] = useState<POIMarker | null>(null);

  // Discovery mode extra settings
  const [maxPoints, setMaxPoints] = useState(5);
  const [maxDuration, setMaxDuration] = useState(120);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [categoryPoints, setCategoryPoints] = useState<Record<string, number>>({});

  // Manual location picking
  const [pickingLocation, setPickingLocation] = useState(false);
  const [locationIsManual, setLocationIsManual] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number }>(SAMARA);

  // Swipeable sheet
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const sheetIsOpen = useRef(true);
  const sheetH = useRef(0);
  const sheetStartY = useRef(0);

  // ── Location ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setLocation(coords);
        setLocationIsManual(false);
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.04, longitudeDelta: 0.04 });
      } catch {
        // геолокация недоступна — работаем без неё
      }
    })();
  }, []);

  // ── Shimmer animation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!poisLoading) {
      shimAnim.stopAnimation();
      shimAnim.setValue(0);
      return;
    }
    Animated.loop(
      Animated.timing(shimAnim, { toValue: 1, duration: 1100, useNativeDriver: true })
    ).start();
  }, [poisLoading]);

  // ── POI fetch with cache ──────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(fetchTimerRef.current);
    setSelectedPoi(null);

    if (activeCategories.length === 0) {
      setPois([]);
      return;
    }

    const lat = location?.latitude ?? SAMARA.latitude;
    const lon = location?.longitude ?? SAMARA.longitude;
    const cacheKey = `${[...activeCategories].sort().join(',')}:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    const cached = poisCache.current.get(cacheKey);

    if (cached && cached.maxRadius >= radiusKm) {
      // Superset cached — filter by haversine distance, no network call
      const filtered = cached.pois.filter(
        (p) => haversineKm(lat, lon, p.lat, p.lon) <= radiusKm * 1.15,
      );
      setPois(filtered);
      return;
    }

    fetchTimerRef.current = setTimeout(async () => {
      setPoisLoading(true);
      try {
        const { data } = await poiApi.list(lat, lon, radiusKm, activeCategories);
        setPois(data);
        const existing = poisCache.current.get(cacheKey);
        if (!existing || radiusKm > existing.maxRadius) {
          poisCache.current.set(cacheKey, { pois: data, maxRadius: radiusKm });
        }
      } catch {
        setPois([]);
      } finally {
        setPoisLoading(false);
      }
    }, 700);

    return () => clearTimeout(fetchTimerRef.current);
  }, [activeCategories, radiusKm, location]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  // Sync per-category counts when categories change
  useEffect(() => {
    setCategoryPoints(prev => {
      const next: Record<string, number> = {};
      for (const cat of activeCategories) next[cat] = prev[cat] ?? 1;
      return next;
    });
  }, [activeCategories]);

  const toggleCategory = (cat: string) =>
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat],
    );

  const updateCategoryCount = useCallback((cat: string, delta: number) => {
    setCategoryPoints(prev => ({ ...prev, [cat]: Math.max(1, Math.min(6, (prev[cat] ?? 1) + delta) ) }));
  }, []);

  const openSearch = () => {
    setSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 80);
  };

  const closeSearch = () => {
    setSearchActive(false);
    setSearchQuery('');
    setSearchResults([]);
    clearTimeout(searchTimerRef.current);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    clearTimeout(searchTimerRef.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(() => fetchPlaces(q), 400);
  };

  const fetchPlaces = async (q: string) => {
    setSearchLoading(true);
    try {
      const { data } = await geoApi.search(q, location?.latitude, location?.longitude);
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addWaypoint = (place: Place) => {
    setWaypoints((prev) => (prev.find((p) => p.id === place.id) ? prev : [...prev, place]));
    mapRef.current?.animateToRegion({ latitude: place.lat, longitude: place.lon, latitudeDelta: 0.02, longitudeDelta: 0.02 });
    closeSearch();
  };

  const removeWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((p) => p.id !== id));
    setSelectedWaypoint((prev) => (prev?.id === id ? null : prev));
  };

  const handleGenerate = async () => {
    const lat = waypoints[0]?.lat ?? location?.latitude ?? SAMARA.latitude;
    const lon = waypoints[0]?.lon ?? location?.longitude ?? SAMARA.longitude;
    const hasWps = waypoints.length > 0;
    const effectivePoints = hasWps
      ? (addRecommended ? waypoints.length + recommendedCount : waypoints.length)
      : (activeCategories.length > 0
          ? Math.max(maxPoints, Object.values(categoryPoints).reduce((a, b) => a + b, 0))
          : maxPoints);
    setLoading(true);
    try {
      const { data } = await routesApi.generate({
        lat, lon, radius_km: radiusKm,
        categories: activeCategories.length ? activeCategories : undefined,
        transport_mode: transport, max_points: effectivePoints,
        waypoints: waypoints.length ? waypoints.map((w) => ({ id: w.id, name: w.name, lat: w.lat, lon: w.lon })) : undefined,
        surprise_me: surpriseMe,
      });
      router.push(`/route/${data.id}?preview=1&originLat=${lat}&originLon=${lon}`);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.detail || 'Не удалось сгенерировать маршрут');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestsSubmit = async () => {
    if (!interestsText.trim()) return;
    setInterestsLoading(true);
    try {
      const { data } = await geoApi.interests(interestsText);
      const cats: string[] = data.categories;
      if (cats.length === 0) {
        Alert.alert('Не распознано', 'Попробуйте описать интересы иначе, например: «люблю кофе и парки»');
        return;
      }
      setActiveCategories(cats);
      setInterestsOpen(false);
      setInterestsText('');
      const lat = location?.latitude ?? SAMARA.latitude;
      const lon = location?.longitude ?? SAMARA.longitude;
      setLoading(true);
      const { data: route } = await routesApi.generate({
        lat, lon, radius_km: radiusKm,
        categories: cats,
        transport_mode: transport,
        max_points: 5,
        waypoints: waypoints.length ? waypoints.map((w) => ({ id: w.id, name: w.name, lat: w.lat, lon: w.lon })) : undefined,
        surprise_me: surpriseMe,
      });
      router.push(`/route/${route.id}?preview=1&originLat=${lat}&originLon=${lon}`);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.detail || 'Не удалось создать маршрут');
    } finally {
      setInterestsLoading(false);
      setLoading(false);
    }
  };

  const shimTranslate = shimAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 160] });

  const expandSheet = useCallback(() => {
    sheetIsOpen.current = true;
    Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: false, tension: 55, friction: 10 }).start();
  }, [sheetAnim]);

  const sheetPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > Math.abs(gs.dx) && Math.abs(gs.dy) > 4,
    onPanResponderGrant: () => {
      sheetAnim.stopAnimation();
      const maxT = Math.max(0, sheetH.current - PEEK_HEIGHT);
      sheetStartY.current = sheetIsOpen.current ? 0 : maxT;
      sheetAnim.setValue(sheetStartY.current);
    },
    onPanResponderMove: (_, gs) => {
      const maxT = Math.max(0, sheetH.current - PEEK_HEIGHT);
      const next = Math.max(0, Math.min(maxT, sheetStartY.current + gs.dy));
      sheetAnim.setValue(next);
    },
    onPanResponderRelease: (_, gs) => {
      const maxT = Math.max(0, sheetH.current - PEEK_HEIGHT);
      const snap = (open: boolean) => {
        sheetIsOpen.current = open;
        Animated.spring(sheetAnim, { toValue: open ? 0 : maxT, useNativeDriver: false, tension: 55, friction: 10 }).start();
      };
      if (Math.abs(gs.dy) < 8) {
        snap(!sheetIsOpen.current); // tap toggles
      } else if (gs.dy > 40) {
        snap(false);
      } else if (gs.dy < -40) {
        snap(true);
      } else {
        snap(sheetIsOpen.current); // snap back
      }
    },
  }), [sheetAnim]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const speedKmh = transport === 'walking' ? 4.5 : 30;
  const durationMin = Math.round((radiusKm * 2) / speedKmh * 60);
  const hasWaypoints = waypoints.length > 0;
  const canAddMore = waypoints.length < MAX_WAYPOINTS;

  const effectivePoints = activeCategories.length > 0 && Object.keys(categoryPoints).length > 0
    ? Object.values(categoryPoints).reduce((a, b) => a + b, 0)
    : maxPoints;

  const isMoodActive = (preset: typeof MOOD_PRESETS[number]) =>
    preset.categories.length === activeCategories.length &&
    preset.categories.every(c => activeCategories.includes(c)) &&
    preset.maxPoints === maxPoints &&
    preset.maxDuration === maxDuration;

  const pluralPoints = (n: number) => {
    if (n === 1) return 'точка';
    if (n <= 4) return 'точки';
    return 'точек';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={SAMARA}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={(r) => setMapCenter({ latitude: r.latitude, longitude: r.longitude })}
      >
        {location && !hasWaypoints && (
          <Circle
            center={location}
            radius={radiusKm * 1000}
            strokeColor={c.accentStrong}
            strokeWidth={1.5}
            fillColor={`${c.accent}18`}
          />
        )}

        {/* Manual location marker */}
        {location && locationIsManual && (
          <Marker
            coordinate={location}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={[styles.manualLocPin, { backgroundColor: c.accent }]}>
              <ManualPinIcon color="#fff" />
            </View>
          </Marker>
        )}

        {/* POI markers */}
        {pois.map((poi) => (
          <Marker
            key={poi.id}
            coordinate={{ latitude: poi.lat, longitude: poi.lon }}
            onPress={() => { setSelectedPoi(poi); expandSheet(); }}
          >
            <View style={[styles.poiPin, { backgroundColor: CATEGORY_COLORS[poi.category] ?? '#888' }]}>
              <View style={styles.poiPinCore} />
            </View>
          </Marker>
        ))}

        {/* Waypoint markers */}
        {waypoints.map((wp, i) => (
          <Marker key={wp.id} coordinate={{ latitude: wp.lat, longitude: wp.lon }} title={wp.name}>
            <View style={[styles.waypointPin, { backgroundColor: c.text1 }]}>
              <Text style={[styles.waypointPinLabel, { color: c.bg }]}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Dim overlay */}
      {searchActive && <Pressable style={styles.dimOverlay} onPress={closeSearch} />}

      {/* Crosshair overlay for manual location picking */}
      {pickingLocation && (
        <>
          <View pointerEvents="none" style={styles.crosshairWrap}>
            <View style={[styles.crosshairLine, styles.crosshairV, { backgroundColor: c.accent }]} />
            <View style={[styles.crosshairLine, styles.crosshairH, { backgroundColor: c.accent }]} />
            <View style={[styles.crosshairDot, { backgroundColor: c.accent, borderColor: c.surface }]} />
          </View>
          <View style={[styles.pickBar, { backgroundColor: c.surface }]}>
            <Text style={[Typography.body, { color: c.text2, flex: 1 }]}>
              Переместите карту, чтобы выбрать точку
            </Text>
            <TouchableOpacity
              style={[styles.pickCancelBtn, { borderColor: c.border2 }]}
              onPress={() => setPickingLocation(false)}
            >
              <Text style={[Typography.cap, { color: c.text2 }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickConfirmBtn, { backgroundColor: c.accent }]}
              onPress={() => {
                setLocation(mapCenter);
                setLocationIsManual(true);
                mapRef.current?.animateToRegion({ ...mapCenter, latitudeDelta: 0.04, longitudeDelta: 0.04 });
                setPickingLocation(false);
              }}
            >
              <CheckCircleIcon color="#fff" />
              <Text style={[Typography.bodyStrong, { color: '#fff', marginLeft: 6 }]}>Выбрать</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Top area ──────────────────────────────────────────────────────── */}
      <SafeAreaView style={styles.topArea} pointerEvents="box-none">
        <View style={styles.topRow}>
          {searchActive ? (
            <View style={[styles.searchBar, { backgroundColor: c.surface }]}>
              <SearchIcon color={c.text3} size={16} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: c.text1, fontFamily: 'Manrope_400Regular' }]}
                placeholder="Поиск мест..."
                placeholderTextColor={c.text3}
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
              <TouchableOpacity onPress={closeSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <XIcon color={c.text3} size={16} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.searchBar, { backgroundColor: c.surface }]}
              onPress={openSearch}
              activeOpacity={0.88}
            >
              <SearchIcon color={c.text3} size={16} />
              <Text style={[Typography.body, { color: c.text3, marginLeft: 8, flex: 1 }]}>
                {hasWaypoints ? 'Добавить ещё точку...' : 'Куда отправимся?'}
              </Text>
              {hasWaypoints && (
                <View style={[styles.countBadge, { backgroundColor: c.text1 }]}>
                  <Text style={[Typography.micro, { color: c.bg, fontFamily: 'Manrope_700Bold' }]}>
                    {waypoints.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {!searchActive && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: c.surface }]}
              onPress={() => setInterestsOpen(true)}
            >
              <LayersIcon color={c.text2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        {!searchActive && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={{ paddingHorizontal: Spacing.screen, gap: 8, alignItems: 'center' }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategories.includes(cat);
              const col = CATEGORY_COLORS[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    { backgroundColor: isActive ? col : c.surface, borderColor: isActive ? col : 'transparent', overflow: 'hidden' },
                  ]}
                  onPress={() => toggleCategory(cat)}
                >
                  <View style={[styles.catDot, { backgroundColor: isActive ? '#fff' : col }]} />
                  <Text style={[Typography.cap, { color: isActive ? '#fff' : c.text2, marginLeft: 5 }]}>
                    {cat}
                  </Text>
                  {poisLoading && isActive && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.shimmerBeam,
                        { transform: [{ translateX: shimTranslate }, { skewX: '-18deg' }] },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Search results */}
        {searchActive && (
          <View style={[styles.resultsBox, { backgroundColor: c.surface }]}>
            {searchLoading ? (
              <View style={styles.resultsMeta}><ActivityIndicator size="small" color={c.text3} /></View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 340 }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.resultRow, { borderBottomColor: c.border },
                      index === searchResults.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => addWaypoint(item)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.resultPinCircle, { backgroundColor: c.surface2 }]}>
                      <MapPinIcon color={c.text2} size={15} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.bodyStrong, { color: c.text1 }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>
                    <PlusIcon color={c.text3} size={15} />
                  </TouchableOpacity>
                )}
              />
            ) : searchQuery.length >= 2 ? (
              <View style={styles.resultsMeta}>
                <Text style={[Typography.cap, { color: c.text3 }]}>Ничего не найдено</Text>
              </View>
            ) : (
              <View style={styles.resultsMeta}>
                <SearchIcon color={c.text3} size={20} />
                <Text style={[Typography.cap, { color: c.text3, marginTop: 8 }]}>Введите название места</Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>

      {/* ── Side controls ─────────────────────────────────────────────────── */}
      {!pickingLocation && (
        <View style={styles.sideControls}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: c.surface }]}
            onPress={() => {
              if (location) {
                mapRef.current?.animateToRegion({ ...location, latitudeDelta: 0.02, longitudeDelta: 0.02 });
              }
            }}
          >
            <LocateIcon color={location ? c.accent : c.text3} />
          </TouchableOpacity>
          {!location && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: c.surface, marginTop: 8 }]}
              onPress={() => setPickingLocation(true)}
            >
              <ManualPinIcon color={c.text2} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Interests modal ───────────────────────────────────────────────── */}
      <Modal visible={interestsOpen} animationType="slide" transparent onRequestClose={() => setInterestsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInterestsOpen(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
          <View style={[styles.modalSheet, { backgroundColor: c.surface, maxHeight: SCREEN_H * 0.88 }]}>

            {/* Grabber + header (fixed) */}
            <View style={styles.modalGrabberArea}>
              <View style={[styles.grabber, { backgroundColor: c.border2 }]} />
            </View>
            <View style={[styles.modalHeader, { paddingHorizontal: Spacing.screen }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.h2, { color: c.text1 }]}>Ваши интересы</Text>
                <Text style={[Typography.micro, { color: c.text3, marginTop: 3 }]}>
                  Опишите словами или выберите категории
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: c.surface2 }]}
                onPress={() => setInterestsOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <XIcon color={c.text2} size={16} />
              </TouchableOpacity>
            </View>

            {/* Scrollable body */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.screen, paddingBottom: 8 }}
            >
              <Text style={[Typography.cap, { color: c.text2, marginBottom: 8 }]}>Опишите словами</Text>
              <TextInput
                style={[
                  styles.interestsInput,
                  {
                    backgroundColor: c.surface2,
                    color: c.text1,
                    borderColor: interestsText ? c.accent : c.border,
                    fontFamily: 'Manrope_400Regular',
                  }
                ]}
                placeholder="Например: хочу уютное кафе у воды, потом прогулку в парке..."
                placeholderTextColor={c.text3}
                value={interestsText}
                onChangeText={setInterestsText}
                multiline
                numberOfLines={3}
              />

              {/* Example phrase chips */}
              <Text style={[Typography.micro, { color: c.text3, marginTop: 10, marginBottom: 6 }]}>
                Попробуйте:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -Spacing.screen }}
                contentContainerStyle={{ paddingHorizontal: Spacing.screen, gap: 8 }}
              >
                {EXAMPLE_PHRASES.map(phrase => {
                  const active = interestsText === phrase;
                  return (
                    <TouchableOpacity
                      key={phrase}
                      style={[
                        styles.exampleChip,
                        { backgroundColor: active ? c.accentSoft : c.surface2, borderColor: active ? c.accent : c.border }
                      ]}
                      onPress={() => setInterestsText(active ? '' : phrase)}
                    >
                      <Text style={[Typography.micro, { color: active ? c.accent : c.text2 }]}>{phrase}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Divider */}
              <View style={styles.orDivider}>
                <View style={[styles.orLine, { backgroundColor: c.border }]} />
                <Text style={[Typography.micro, { color: c.text3, marginHorizontal: 10 }]}>
                  или выберите категории
                </Text>
                <View style={[styles.orLine, { backgroundColor: c.border }]} />
              </View>

              {/* Selected count + clear */}
              {activeCategories.length > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={[Typography.cap, { color: c.text2 }]}>
                    {'Выбрано: '}
                    <Text style={{ color: c.text1, fontFamily: 'Manrope_700Bold' }}>{activeCategories.length}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setActiveCategories([])}>
                    <Text style={[Typography.cap, { color: c.accent }]}>Очистить</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Category grid — 2 columns */}
              <View style={styles.modalCatGrid}>
                {CATEGORIES.map(cat => {
                  const active = activeCategories.includes(cat);
                  const col = CATEGORY_COLORS[cat] ?? '#888';
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.modalCatChip,
                        { backgroundColor: active ? col + '1A' : c.surface2, borderColor: active ? col : c.border }
                      ]}
                      onPress={() => toggleCategory(cat)}
                    >
                      <View style={[styles.modalCatDot, { backgroundColor: col }]} />
                      <Text style={[Typography.cap, { color: active ? col : c.text1, flex: 1, marginLeft: 6 }]}>{cat}</Text>
                      {active && <CheckIcon color={col} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Fixed footer */}
            <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity
                style={[
                  styles.generateBtn,
                  {
                    backgroundColor: c.text1,
                    opacity: (interestsLoading || loading || (!interestsText.trim() && activeCategories.length === 0)) ? 0.45 : 1,
                  }
                ]}
                onPress={() => {
                  if (interestsText.trim()) {
                    handleInterestsSubmit();
                  } else {
                    setInterestsOpen(false);
                    handleGenerate();
                  }
                }}
                disabled={interestsLoading || loading || (!interestsText.trim() && activeCategories.length === 0)}
              >
                {(interestsLoading || loading) ? <ActivityIndicator color={c.bg} /> : (
                  <>
                    <SparkleIcon color={c.bg} />
                    <Text style={[Typography.bodyStrong, { color: c.bg, marginLeft: 10 }]}>
                      {interestsText.trim() ? 'Найти по описанию' : 'Сгенерировать маршрут'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Bottom sheet ──────────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.bottomSheet, { backgroundColor: c.surface, transform: [{ translateY: sheetAnim }] }]}
        onLayout={(e) => { sheetH.current = e.nativeEvent.layout.height; }}
      >
        <View {...sheetPan.panHandlers} style={styles.grabberArea}>
          <View style={[styles.grabber, { backgroundColor: c.border2 }]} />
        </View>

        {selectedPoi ? (
          /* ── POI detail ── */
          <View>
            <View style={styles.poiDetailHeader}>
              <View style={[styles.poiCatBadge, { backgroundColor: (CATEGORY_COLORS[selectedPoi.category] ?? '#888') + '22' }]}>
                <View style={[styles.poiCatDot, { backgroundColor: CATEGORY_COLORS[selectedPoi.category] ?? '#888' }]} />
                <Text style={[Typography.cap, { color: CATEGORY_COLORS[selectedPoi.category] ?? '#888', marginLeft: 5 }]}>
                  {selectedPoi.category}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPoi(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <XIcon color={c.text3} size={18} />
              </TouchableOpacity>
            </View>

            <Text style={[Typography.h3, { color: c.text1, marginTop: 8 }]} numberOfLines={2}>
              {selectedPoi.name}
            </Text>

            {!!selectedPoi.address && (
              <View style={styles.poiRow}>
                <MapPinIcon color={c.text3} size={14} />
                <Text style={[Typography.cap, { color: c.text2, marginLeft: 7, flex: 1 }]} numberOfLines={2}>
                  {selectedPoi.address}
                </Text>
              </View>
            )}
            {!!selectedPoi.opening_hours && (
              <View style={styles.poiRow}>
                <ClockIcon color={c.text3} size={14} />
                <Text style={[Typography.cap, { color: c.text2, marginLeft: 7, flex: 1 }]} numberOfLines={2}>
                  {selectedPoi.opening_hours}
                </Text>
              </View>
            )}
            {!!selectedPoi.phone && (
              <View style={styles.poiRow}>
                <PhoneIcon color={c.text3} size={14} />
                <Text style={[Typography.cap, { color: c.text2, marginLeft: 7 }]}>
                  {selectedPoi.phone}
                </Text>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poiLinksRow} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                style={[styles.poiLinkChip, { backgroundColor: c.surface2 }]}
                onPress={() => Linking.openURL(`https://maps.google.com/maps?q=${selectedPoi.lat},${selectedPoi.lon}`).catch(() => {})}
              >
                <MapPinIcon color={c.text2} size={13} />
                <Text style={[Typography.micro, { color: c.text1, marginLeft: 5, fontFamily: 'Manrope_600SemiBold' }]}>Google Maps</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.poiLinkChip, { backgroundColor: c.surface2 }]}
                onPress={() => Linking.openURL(`https://2gis.ru/geo/${selectedPoi.lon},${selectedPoi.lat}`).catch(() => {})}
              >
                <MapPinIcon color={c.text2} size={13} />
                <Text style={[Typography.micro, { color: c.text1, marginLeft: 5, fontFamily: 'Manrope_600SemiBold' }]}>2GIS</Text>
              </TouchableOpacity>
              {!!selectedPoi.website && (
                <TouchableOpacity
                  style={[styles.poiLinkChip, { backgroundColor: c.surface2 }]}
                  onPress={() => Linking.openURL(selectedPoi.website!).catch(() => {})}
                >
                  <GlobeIcon color={c.text2} size={13} />
                  <Text style={[Typography.micro, { color: c.text1, marginLeft: 5, fontFamily: 'Manrope_600SemiBold' }]}>Сайт</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.poiActionBtn, { backgroundColor: c.text1, marginTop: 10 }]}
              onPress={() => {
                addWaypoint({
                  id: selectedPoi.id,
                  name: selectedPoi.name,
                  address: selectedPoi.address ?? '',
                  lat: selectedPoi.lat,
                  lon: selectedPoi.lon,
                });
                setSelectedPoi(null);
              }}
            >
              <PlusIcon color={c.bg} size={15} />
              <Text style={[Typography.cap, { color: c.bg, marginLeft: 6 }]}>В маршрут</Text>
            </TouchableOpacity>
          </View>

        ) : hasWaypoints ? (
          /* ── Waypoints mode ── */
          <View>
            <View style={styles.sheetTitleRow}>
              <Text style={[Typography.bodyStrong, { color: c.text1 }]}>
                Маршрут · {waypoints.length} {pluralPoints(waypoints.length)}
              </Text>
              <TouchableOpacity onPress={() => { setWaypoints([]); setSelectedWaypoint(null); }}>
                <Text style={[Typography.cap, { color: c.text3 }]}>Очистить</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.waypointList}>
              {waypoints.map((wp, i) => {
                const isSelected = selectedWaypoint?.id === wp.id;
                return (
                  <View key={wp.id}>
                    <View style={[styles.waypointItem, isSelected && { opacity: 1 }]}>
                      <View style={[styles.waypointNum, { backgroundColor: c.text1 }]}>
                        <Text style={[styles.waypointNumLabel, { color: c.bg }]}>{i + 1}</Text>
                      </View>
                      <TouchableOpacity
                        style={{ flex: 1, marginHorizontal: 10 }}
                        onPress={() => setSelectedWaypoint(isSelected ? null : wp)}
                        activeOpacity={0.7}
                      >
                        <Text style={[Typography.body, { color: c.text1 }]} numberOfLines={1}>{wp.name}</Text>
                        {wp.address ? (
                          <Text style={[Typography.micro, { color: c.text3 }]} numberOfLines={1}>{wp.address}</Text>
                        ) : null}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeWaypoint(wp.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <TrashIcon color={c.text3} />
                      </TouchableOpacity>
                    </View>

                    {isSelected && (
                      <View style={[styles.waypointDetail, { backgroundColor: c.surface2, borderColor: c.border }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text style={[Typography.cap, { color: c.text2 }]} numberOfLines={1}>{wp.name}</Text>
                          <TouchableOpacity onPress={() => setSelectedWaypoint(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <XIcon color={c.text3} size={14} />
                          </TouchableOpacity>
                        </View>
                        {wp.address ? (
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                            <MapPinIcon color={c.text3} size={12} />
                            <Text style={[Typography.micro, { color: c.text2, marginLeft: 5, flex: 1 }]} numberOfLines={2}>{wp.address}</Text>
                          </View>
                        ) : null}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[styles.poiLinkChip, { backgroundColor: c.surface3 }]}
                            onPress={() => Linking.openURL(`https://maps.google.com/maps?q=${wp.lat},${wp.lon}`).catch(() => {})}
                          >
                            <MapPinIcon color={c.text2} size={12} />
                            <Text style={[Typography.micro, { color: c.text1, marginLeft: 4, fontFamily: 'Manrope_600SemiBold' }]}>Google Maps</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.poiLinkChip, { backgroundColor: c.surface3 }]}
                            onPress={() => Linking.openURL(`https://2gis.ru/geo/${wp.lon},${wp.lat}`).catch(() => {})}
                          >
                            <MapPinIcon color={c.text2} size={12} />
                            <Text style={[Typography.micro, { color: c.text1, marginLeft: 4, fontFamily: 'Manrope_600SemiBold' }]}>2ГИС</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {canAddMore && (
              <TouchableOpacity style={[styles.addPointBtn, { borderColor: c.border }]} onPress={openSearch}>
                <PlusIcon color={c.text3} size={15} />
                <Text style={[Typography.body, { color: c.text3, marginLeft: 8 }]}>Добавить точку</Text>
              </TouchableOpacity>
            )}

            <View style={styles.transportRow}>
              {(['walking', 'driving'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.transportBtn, { backgroundColor: transport === mode ? c.text1 : c.surface2 }]}
                  onPress={() => setTransport(mode)}
                >
                  {mode === 'walking'
                    ? <WalkIcon color={transport === mode ? c.bg : c.text2} />
                    : <CarIcon color={transport === mode ? c.bg : c.text2} />}
                  <Text style={[Typography.cap, { color: transport === mode ? c.bg : c.text2, marginLeft: 6 }]}>
                    {mode === 'walking' ? 'Пешком' : 'Авто'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recommended points checkbox */}
            <TouchableOpacity
              style={[styles.recommendedToggle, {
                backgroundColor: addRecommended ? c.accentSoft : c.surface2,
                borderColor: addRecommended ? c.accent : c.border,
                marginTop: 12,
              }]}
              onPress={() => setAddRecommended(v => !v)}
              activeOpacity={0.75}
            >
              <View style={[styles.checkboxSquare, {
                backgroundColor: addRecommended ? c.accent : 'transparent',
                borderColor: addRecommended ? c.accent : c.border2,
              }]}>
                {addRecommended && <CheckIcon color="#fff" />}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Добавить рекомендованные</Text>
                <Text style={[Typography.micro, { color: c.text3, marginTop: 1 }]}>
                  ИИ дополнит маршрут интересными местами
                </Text>
              </View>
            </TouchableOpacity>

            {addRecommended && (
              <View style={[styles.recommendedBlock, { backgroundColor: c.surface2, borderColor: c.border }]}>
                <Text style={[Typography.cap, { color: c.text2, marginBottom: 8 }]}>Сколько мест добавить</Text>
                <View style={styles.pillRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.numPill, {
                        backgroundColor: recommendedCount === n ? c.text1 : c.surface3,
                        borderColor: recommendedCount === n ? c.text1 : c.border,
                      }]}
                      onPress={() => setRecommendedCount(n)}
                    >
                      <Text style={[Typography.cap, {
                        color: recommendedCount === n ? c.bg : c.text2,
                        fontFamily: 'Manrope_700Bold',
                      }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={{ marginTop: 12 }}>
              <SurpriseToggle active={surpriseMe} onToggle={() => setSurpriseMe((v) => !v)} theme={c} />
            </View>

            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: c.text1, opacity: loading ? 0.65 : 1 }]}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={c.bg} /> : (
                <>
                  <SparkleIcon color={c.bg} />
                  <Text style={[styles.generateBtnText, { color: c.bg }]}>
                    Построить маршрут
                  </Text>
                  <ArrowRightIcon color={c.bg} />
                </>
              )}
            </TouchableOpacity>
          </View>

        ) : (
          /* ── Discovery mode ── */
          <View>

            {/* Mood presets */}
            <Text style={[Typography.capUp, { color: c.text3, marginBottom: 10 }]}>Настроение</Text>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -Spacing.screen, marginBottom: 16 }}
              contentContainerStyle={{ paddingHorizontal: Spacing.screen, gap: 8 }}
            >
              {MOOD_PRESETS.map((preset) => {
                const active = isMoodActive(preset);
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.moodChip, { backgroundColor: active ? c.accent : c.surface2, borderColor: active ? c.accent : c.border }]}
                    onPress={() => {
                      setActiveCategories(preset.categories);
                      setTransport(preset.transport);
                      setMaxPoints(preset.maxPoints);
                      setMaxDuration(preset.maxDuration);
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{preset.emoji}</Text>
                    <Text style={[Typography.cap, { color: active ? '#fff' : c.text1, marginLeft: 5, fontFamily: 'Manrope_600SemiBold' }]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Radius + Transport */}
            <View style={styles.radiusHeaderRow}>
              <View>
                <Text style={[Typography.cap, { color: c.text2 }]}>Радиус поиска</Text>
                <Text style={[Typography.h1, { color: c.text1, fontSize: 38, lineHeight: 44 }]}>
                  {radiusKm.toFixed(1)}
                  <Text style={[Typography.h3, { color: c.text2 }]}> км</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.transportBtnSm, { backgroundColor: c.surface2 }]}
                onPress={() => setTransport((t) => (t === 'walking' ? 'driving' : 'walking'))}
              >
                {transport === 'walking' ? <WalkIcon color={c.text1} /> : <CarIcon color={c.text1} />}
                <View style={{ marginLeft: 8 }}>
                  <Text style={[Typography.cap, { color: c.text1 }]}>
                    {transport === 'walking' ? 'Пешком' : 'Авто'}
                  </Text>
                  <Text style={[Typography.micro, { color: c.text3 }]}>~{durationMin} мин</Text>
                </View>
              </TouchableOpacity>
            </View>
            <RadiusSlider value={radiusKm} onChange={setRadiusKm} fillColor={c.text1} trackColor={c.surface3} />

            {/* ── Advanced block (hidden until expanded) ── */}
            <TouchableOpacity
              style={[styles.advancedToggle, { borderColor: c.border }]}
              onPress={() => setAdvancedOpen(v => !v)}
              activeOpacity={0.75}
            >
              <SlidersIcon color={c.text2} />
              <Text style={[Typography.cap, { color: c.text2, flex: 1, marginLeft: 8 }]}>
                Дополнительно
              </Text>
              <Text style={[Typography.cap, { color: c.text3 }]}>
                {effectivePoints} точек · {DURATION_OPTIONS.find(d => d.value === maxDuration)?.label ?? `${maxDuration} мин`}
              </Text>
              <Text style={[{ color: c.text3, marginLeft: 6, fontSize: 12 }]}>
                {advancedOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {advancedOpen && (
              <View style={[styles.advancedBlock, { backgroundColor: c.surface2, borderColor: c.border }]}>

                {/* Points count */}
                <Text style={[Typography.cap, { color: c.text2, marginBottom: 8 }]}>Количество точек</Text>
                {activeCategories.length === 0 ? (
                  /* Global selector */
                  <View style={styles.pillRow}>
                    {POINT_OPTIONS.map(n => (
                      <TouchableOpacity
                        key={n}
                        style={[styles.numPill, { backgroundColor: maxPoints === n ? c.text1 : c.surface3, borderColor: maxPoints === n ? c.text1 : c.border }]}
                        onPress={() => setMaxPoints(n)}
                      >
                        <Text style={[Typography.cap, { color: maxPoints === n ? c.bg : c.text2, fontFamily: 'Manrope_700Bold' }]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  /* Per-category rows */
                  <View style={{ gap: 6, marginBottom: 4 }}>
                    {activeCategories.map(cat => {
                      const cnt = categoryPoints[cat] ?? 1;
                      const col = CATEGORY_COLORS[cat] ?? c.accent;
                      return (
                        <View key={cat} style={styles.catCountRow}>
                          <View style={[styles.catCountDot, { backgroundColor: col }]} />
                          <Text style={[Typography.body, { color: c.text1, flex: 1, marginLeft: 8 }]}>{cat}</Text>
                          <TouchableOpacity style={[styles.countBtn, { borderColor: c.border2 }]} onPress={() => updateCategoryCount(cat, -1)}>
                            <Text style={[Typography.h3, { color: c.text2, lineHeight: 20 }]}>−</Text>
                          </TouchableOpacity>
                          <Text style={[Typography.bodyStrong, { color: c.text1, width: 26, textAlign: 'center' }]}>{cnt}</Text>
                          <TouchableOpacity style={[styles.countBtn, { borderColor: c.border2 }]} onPress={() => updateCategoryCount(cat, 1)}>
                            <Text style={[Typography.h3, { color: c.text2, lineHeight: 20 }]}>+</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>
                      Итого: {effectivePoints} {effectivePoints === 1 ? 'точка' : effectivePoints < 5 ? 'точки' : 'точек'}
                    </Text>
                  </View>
                )}

                <View style={[styles.advDivider, { backgroundColor: c.border }]} />

                {/* Duration */}
                <Text style={[Typography.cap, { color: c.text2, marginBottom: 8 }]}>Максимальная длительность</Text>
                <View style={styles.pillRow}>
                  {DURATION_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.durationPill, { backgroundColor: maxDuration === opt.value ? c.text1 : c.surface3, borderColor: maxDuration === opt.value ? c.text1 : c.border }]}
                      onPress={() => setMaxDuration(opt.value)}
                    >
                      <Text style={[Typography.cap, { color: maxDuration === opt.value ? c.bg : c.text2 }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <SurpriseToggle active={surpriseMe} onToggle={() => setSurpriseMe((v) => !v)} theme={c} />

            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: c.text1, opacity: loading ? 0.65 : 1 }]}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={c.bg} /> : (
                <>
                  <SparkleIcon color={c.bg} />
                  <Text style={[Typography.bodyStrong, { color: c.bg, marginLeft: 10 }]}>
                    Сгенерировать маршрут
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Top
  topArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topRow: { flexDirection: 'row', paddingHorizontal: Spacing.screen, paddingTop: 8, gap: 8 },
  searchBar: {
    flex: 1, height: 48, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, paddingVertical: 0 },
  iconBtn: {
    width: 48, height: 48, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  chipsRow: { marginTop: 8 },
  countBadge: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.pill, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  shimmerBeam: {
    position: 'absolute', top: 0, bottom: 0, width: 44,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },

  // Dim + search results
  dimOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 9,
  },
  resultsBox: {
    marginHorizontal: Spacing.screen, marginTop: 8,
    borderRadius: Radius.card, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  resultsMeta: { padding: 20, alignItems: 'center' },
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  resultPinCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  // Map markers
  poiPin: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 3,
  },
  poiPinCore: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  waypointPin: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  waypointPinLabel: { fontSize: 13, fontWeight: '700' },

  // Crosshair
  crosshairWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', zIndex: 4,
  },
  crosshairLine: { position: 'absolute' },
  crosshairV: { width: 1.5, height: 40, top: '50%', marginTop: -20 },
  crosshairH: { height: 1.5, width: 40, left: '50%', marginLeft: -20 },
  crosshairDot: {
    width: 10, height: 10, borderRadius: 5, borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2,
  },
  // Pick bar
  pickBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.screen, paddingTop: 14, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 12,
  },
  pickCancelBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  pickConfirmBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radius.pill,
  },

  // Side controls
  sideControls: { position: 'absolute', right: 16, top: 200, zIndex: 5 },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
    borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.screen, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 28, elevation: 16,
  },
  grabberArea: { alignItems: 'center', paddingTop: 12, paddingBottom: 10 },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  manualLocPin: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },
  sheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // POI detail
  poiDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  poiCatBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  poiCatDot: { width: 7, height: 7, borderRadius: 4 },
  poiRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  poiActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  poiLinksRow: { marginTop: 14 },
  poiLinkChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill,
  },
  poiActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, borderRadius: Radius.pill,
  },

  // Waypoints list
  waypointList: { marginTop: 12, gap: 6 },
  waypointItem: { flexDirection: 'row', alignItems: 'center' },
  waypointNum: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  waypointNumLabel: { fontSize: 12, fontWeight: '700' },
  waypointDetail: {
    marginTop: 4, marginLeft: 34, borderRadius: Radius.md, borderWidth: 1,
    padding: 10,
  },
  addPointBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 44, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', marginTop: 10,
  },
  recommendedToggle: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  checkboxSquare: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  recommendedBlock: {
    borderRadius: Radius.md, borderWidth: 1,
    padding: Spacing.md, marginTop: 8,
  },
  generateBtnText: {
    fontSize: 15, fontFamily: 'Manrope_600SemiBold', lineHeight: 22,
    marginLeft: 10, marginRight: 6,
  },
  transportRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  transportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: Radius.pill,
  },

  // Discovery mode
  radiusHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transportBtnSm: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill,
  },

  // Slider
  sliderHit: {
    height: THUMB + 12, justifyContent: 'center',
    marginTop: 4,
  },
  sliderTrack: { height: 6, borderRadius: 3, overflow: 'visible' },
  sliderFill: { height: '100%', borderRadius: 3 },
  sliderThumb: {
    position: 'absolute',
    width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },

  // Interests modal
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 20,
  },
  modalGrabberArea: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  modalCloseBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  modalFooter: {
    paddingHorizontal: Spacing.screen, paddingTop: 12, paddingBottom: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  interestsInput: {
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },
  exampleChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  modalCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalCatChip: {
    flexDirection: 'row', alignItems: 'center',
    flexGrow: 1, flexBasis: '45%',
    paddingHorizontal: 10, paddingVertical: 9,
    borderRadius: Radius.md, borderWidth: 1,
  },
  modalCatDot: { width: 7, height: 7, borderRadius: 4 },
  presetChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.pill, borderWidth: 1,
  },

  // Generate button
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: Radius.pill,
  },

  // Mood presets
  moodChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.pill, borderWidth: 1,
  },

  // Advanced toggle
  advancedToggle: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, marginBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -Spacing.screen, paddingHorizontal: Spacing.screen,
  },

  // Advanced block
  advancedBlock: {
    borderRadius: Radius.md, borderWidth: 1,
    padding: Spacing.base, marginBottom: 12,
  },
  advDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },

  // Points pill row
  pillRow: { flexDirection: 'row', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  numPill: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  durationPill: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.pill, borderWidth: 1,
  },

  // Per-category count rows
  catCountRow: { flexDirection: 'row', alignItems: 'center' },
  catCountDot: { width: 8, height: 8, borderRadius: 4 },
  countBtn: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
