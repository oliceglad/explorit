import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Dimensions, ActivityIndicator,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { routesApi, proxyUrl } from '@/services/api';

const { width: SCREEN_W } = Dimensions.get('window');

interface RouteDetail {
  id: string;
  author_id: string;
  author_nickname?: string;
  author_avatar_url?: string;
  title?: string;
  description?: string;
  photo_url?: string;
  photos?: string[];
  distance_m?: number;
  duration_min?: number;
  transport_mode: string;
  is_public: boolean;
  points: any[];
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function WalkIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={5} r={2} stroke={color} strokeWidth={1.75} />
      <Path d="M8 21l2-6 2 3 2-5 2 4" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12l1-4 3 2 2-2" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CarIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M5 17H3v-5l2-5h14l2 5v5h-2" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx={7.5} cy={17} r={1.5} stroke={color} strokeWidth={1.75} />
      <Circle cx={16.5} cy={17} r={1.5} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function PinIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" stroke={color} strokeWidth={1.75} />
      <Circle cx={12} cy={10} r={2.5} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

// ─── Photo Gallery ────────────────────────────────────────────────────────────

function PhotoGallery({ photos }: { photos: string[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const c = useTheme();

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIdx(idx);
  };

  if (photos.length === 0) {
    return (
      <View style={[styles.photoPlaceholder, { backgroundColor: c.surface2 }]}>
        <Text style={{ fontSize: 48 }}>🗺</Text>
        <Text style={[Typography.cap, { color: c.text3, marginTop: 8 }]}>Нет фотографий</Text>
      </View>
    );
  }

  return (
    <View style={styles.galleryWrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {photos.map((uri, i) => (
          <View key={i} style={styles.gallerySlide}>
            {imgErrors[i] ? (
              <View style={[styles.photoPlaceholder, { backgroundColor: c.surface2 }]}>
                <Text style={{ fontSize: 36 }}>🖼</Text>
                <Text style={[Typography.micro, { color: c.text3, marginTop: 4 }]}>Не удалось загрузить</Text>
              </View>
            ) : (
              <Image
                source={{ uri }}
                style={styles.galleryImg}
                resizeMode="cover"
                onError={() => setImgErrors((prev) => ({ ...prev, [i]: true }))}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {/* Page dots */}
      {photos.length > 1 && (
        <View style={styles.dotsRow}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === activeIdx ? '#fff' : 'rgba(255,255,255,0.45)' },
                i === activeIdx && { width: 16 },
              ]}
            />
          ))}
        </View>
      )}

      {/* Photo count badge */}
      {photos.length > 1 && (
        <View style={styles.countBadge}>
          <Text style={[Typography.micro, { color: '#fff' }]}>
            {activeIdx + 1} / {photos.length}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  const c = useTheme();
  return (
    <View style={[styles.statChip, { backgroundColor: c.surface2 }]}>
      {icon}
      <Text style={[Typography.cap, { color: c.text2, marginLeft: 5 }]}>{label}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreRouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    routesApi.get(id).then(({ data }) => setRoute(data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const allPhotos = route
    ? [...new Set([...(route.photos ?? []), ...(route.photo_url ? [route.photo_url] : [])])]
        .map((u) => proxyUrl(u) ?? u)
    : [];

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!route) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <View style={styles.loadingWrap}>
          <Text style={[Typography.body, { color: c.text3 }]}>Маршрут не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  const distKm = ((route.distance_m ?? 0) / 1000).toFixed(1);
  const isWalking = route.transport_mode === 'walking';

  return (
    <View style={[styles.safe, { backgroundColor: c.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Photo gallery — full width, no safe area top */}
        <PhotoGallery photos={allPhotos} />

        {/* Back button overlay */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <View style={styles.backBtnInner}>
            <BackIcon color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={[Typography.h2, { color: c.text1 }]}>
            {route.title || 'Маршрут'}
          </Text>

          {/* Author row */}
          {route.author_nickname && (
            <TouchableOpacity
              style={styles.authorRow}
              onPress={() => router.push(`/user/${route.author_id}`)}
            >
              <Avatar size={32} name={route.author_nickname} uri={proxyUrl(route.author_avatar_url)} />
              <View style={{ marginLeft: 10 }}>
                <Text style={[Typography.bodyStrong, { color: c.text1 }]}>{route.author_nickname}</Text>
                <Text style={[Typography.micro, { color: c.text3 }]}>Автор маршрута</Text>
              </View>
              <View style={{ flex: 1 }} />
              <View style={[styles.followHint, { backgroundColor: c.accent + '1A', borderColor: c.accent + '40' }]}>
                <Text style={[Typography.micro, { color: c.accent }]}>Профиль →</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Stats chips */}
          <View style={styles.statsRow}>
            <StatChip
              icon={isWalking ? <WalkIcon color={c.accent} /> : <CarIcon color={c.accent} />}
              label={isWalking ? 'Пешком' : 'На авто'}
              color={c.accent}
            />
            <StatChip
              icon={<PinIcon color={c.accent} />}
              label={`${distKm} км`}
              color={c.accent}
            />
            <StatChip
              icon={<Text style={{ fontSize: 12 }}>⏱</Text>}
              label={`${route.duration_min ?? '?'} мин`}
              color={c.accent}
            />
            <StatChip
              icon={<Text style={{ fontSize: 12 }}>📍</Text>}
              label={`${route.points?.length ?? 0} точек`}
              color={c.accent}
            />
          </View>

          {/* Description */}
          {route.description ? (
            <View style={[styles.descBlock, { backgroundColor: c.surface2, borderRadius: Radius.card }]}>
              <Text style={[Typography.body, { color: c.text1, lineHeight: 22 }]}>
                {route.description}
              </Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Use button */}
          <Button
            label="Использовать маршрут"
            variant="primary"
            size="lg"
            onPress={() => router.push(`/route/${route.id}`)}
            style={{ marginBottom: 8 }}
          />
          <Text style={[Typography.micro, { color: c.text3, textAlign: 'center' }]}>
            Маршрут откроется на карте
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const GALLERY_H = SCREEN_W * 0.75;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Gallery
  galleryWrap: { position: 'relative', width: SCREEN_W, height: GALLERY_H },
  gallerySlide: { width: SCREEN_W, height: GALLERY_H },
  galleryImg: { width: SCREEN_W, height: GALLERY_H },
  photoPlaceholder: { width: SCREEN_W, height: GALLERY_H, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  countBadge: { position: 'absolute', top: 12, right: 14, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },

  // Back button
  backBtn: { position: 'absolute', top: 52, left: Spacing.screen },
  backBtnInner: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },

  // Content
  content: { padding: Spacing.screen, paddingTop: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 4 },
  followHint: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill, borderWidth: 1 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 4 },
  statChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill },
  descBlock: { marginTop: 16, padding: 14 },
  divider: { height: 1, marginVertical: 24 },
});
