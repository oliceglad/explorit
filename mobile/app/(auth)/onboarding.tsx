import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, SafeAreaView,
  FlatList, Animated, ViewToken, ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, ThemeColors } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import Svg, { Rect, Circle, Path, G } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface Chip { label: string; pos: ViewStyle }
interface Slide {
  key: string;
  emoji: string;
  accentKey: 'accent' | 'info' | 'warn';
  title: string;
  subtitle: string;
  chips: Chip[];
}

const SLIDES: Slide[] = [
  {
    key: 'discover',
    emoji: '🎲',
    accentKey: 'accent',
    title: 'Загляни туда,\nгде ещё не был.',
    subtitle: 'Случайный маршрут по городу с точками, подобранными под тебя',
    chips: [
      { label: 'Набережная',    pos: { top: '16%', left: '4%' } },
      { label: 'Кофейня',       pos: { top: '58%', right: '4%' } },
      { label: 'Парк Гагарина', pos: { bottom: '10%', left: '6%' } },
    ],
  },
  {
    key: 'route',
    emoji: '🧭',
    accentKey: 'info',
    title: 'Маршрут\nза 3 секунды.',
    subtitle: 'Укажи время и радиус — мы построим идеальный путь по твоему кварталу',
    chips: [
      { label: '2 часа',  pos: { top: '20%', right: '6%' } },
      { label: 'Пешком',  pos: { top: '54%', left: '4%' } },
      { label: '5 точек', pos: { bottom: '12%', right: '8%' } },
    ],
  },
  {
    key: 'share',
    emoji: '🌿',
    accentKey: 'accent',
    title: 'Делись\nи вдохновляй.',
    subtitle: 'Публикуй свои маршруты и открывай городские истории других людей',
    chips: [
      { label: 'Подписчики', pos: { top: '18%', left: '5%' } },
      { label: '❤️ Лайки',   pos: { top: '56%', right: '3%' } },
      { label: 'Отзывы',     pos: { bottom: '14%', left: '8%' } },
    ],
  },
];

// ─── SVG map illustrations (full-screen) ─────────────────────────────────────
// ViewBox matches the physical screen so pins land where chip labels float.
// Hero area starts at ~14 % of screen height (logo + safe-area inset) and
// spans ~58 % of screen height; bottom 28 % is dots + CTA.
const VW = width;
const VH = height;
const SVX = [Math.round(VW*0.21), Math.round(VW*0.45), Math.round(VW*0.67)];
const SHY = [
  Math.round(VH*0.20), Math.round(VH*0.38),
  Math.round(VH*0.56), Math.round(VH*0.73),
];
const ST = 12;

// Chip % positions are relative to the hero view; convert to full-screen SVG coords.
const hy  = (f: number) => Math.round((0.14 + f * 0.58) * VH);   // top-anchored
const hyB = (f: number) => Math.round((0.72 - f * 0.58) * VH);   // bottom-anchored
const hx  = (f: number) => Math.round(f * VW);
const hxR = (f: number) => Math.round((1 - f) * VW);

function CityGrid({ n }: { n: string }) {
  const cols: [number, number][] = [
    [0, SVX[0]], [SVX[0]+ST, SVX[1]], [SVX[1]+ST, SVX[2]], [SVX[2]+ST, VW],
  ];
  const rows: [number, number][] = [
    [0, SHY[0]], [SHY[0]+ST, SHY[1]], [SHY[1]+ST, SHY[2]],
    [SHY[2]+ST, SHY[3]], [SHY[3]+ST, VH],
  ];
  return (
    <G>
      {rows.flatMap(([y1, y2], ri) =>
        cols.map(([x1, x2], ci) => (
          <Rect key={`b${ri}${ci}`} x={x1} y={y1} width={x2-x1} height={y2-y1}
            fill={n} fillOpacity={0.05} />
        ))
      )}
      {SVX.map(x => <Rect key={`sv${x}`} x={x} y={0} width={ST} height={VH} fill={n} fillOpacity={0.11} />)}
      {SHY.map(y => <Rect key={`sh${y}`} x={0} y={y} width={VW} height={ST} fill={n} fillOpacity={0.11} />)}
    </G>
  );
}

function MapPin({ x, y, a }: { x: number; y: number; a: string }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={14} fill={a} fillOpacity={0.16} />
      <Circle cx={x} cy={y} r={6}  fill={a} fillOpacity={0.90} />
    </G>
  );
}

// Slide 1 – Набережная (top 16 % left 4 %) · Кофейня (top 58 % right 4 %) · Парк Гагарина (bottom 10 % left 6 %)
function DiscoverMap({ a, n }: { a: string; n: string }) {
  const riverH = Math.round(VH * 0.26);
  const parkY  = Math.round(VH * 0.60);
  const trees  = [0.04,0.11,0.18,0.06,0.14,0.10,0.19].map((xf, i) => [
    Math.round(xf * VW),
    Math.round((0.63 + i * 0.03) * VH),
  ]);
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`}>
      <CityGrid n={n} />
      <Rect x={0} y={0} width={VW} height={riverH} fill="#5BAAE8" fillOpacity={0.20} />
      <Path
        d={`M0,${Math.round(riverH*0.36)} Q${Math.round(VW*0.25)},${Math.round(riverH*0.26)} ${Math.round(VW*0.5)},${Math.round(riverH*0.36)} Q${Math.round(VW*0.75)},${Math.round(riverH*0.46)} ${VW},${Math.round(riverH*0.36)}`}
        fill="none" stroke="#5BAAE8" strokeWidth={1.5} strokeOpacity={0.38} />
      <Path
        d={`M0,${Math.round(riverH*0.63)} Q${Math.round(VW*0.25)},${Math.round(riverH*0.73)} ${Math.round(VW*0.5)},${Math.round(riverH*0.63)} Q${Math.round(VW*0.75)},${Math.round(riverH*0.53)} ${VW},${Math.round(riverH*0.63)}`}
        fill="none" stroke="#5BAAE8" strokeWidth={1.5} strokeOpacity={0.38} />
      <Rect x={0} y={riverH-3} width={VW} height={4} fill="#5BAAE8" fillOpacity={0.44} />
      <Rect x={0} y={parkY} width={SVX[0]} height={VH-parkY} fill="#4DB870" fillOpacity={0.22} />
      {trees.map(([tx, ty]) =>
        <Circle key={`t${tx}${ty}`} cx={tx} cy={ty} r={6} fill="#3DA560" fillOpacity={0.34} />
      )}
      <MapPin x={hx(0.10)}  y={hy(0.16)}  a={a} />
      <MapPin x={hxR(0.08)} y={hy(0.58)}  a={a} />
      <MapPin x={hx(0.12)}  y={hyB(0.10)} a={a} />
    </Svg>
  );
}

// Slide 2 – 2 часа (top 20 % right 6 %) · Пешком (top 54 % left 4 %) · 5 точек (bottom 12 % right 8 %)
function RouteMap({ a, n }: { a: string; n: string }) {
  const s = SHY.map(y => y + ST / 2);
  const rD = [
    `M${hxR(0.08)},${s[0]}`, `L${SVX[1]},${s[0]}`,
    `L${SVX[1]},${s[1]}`,    `L${SVX[0]-20},${s[1]}`,
    `L${SVX[0]-20},${s[2]}`, `L${SVX[1]},${s[2]}`,
    `L${SVX[1]},${s[3]}`,    `L${hxR(0.10)},${s[3]}`,
  ].join(' ');
  const stops = [
    { x: hxR(0.08),    y: s[0] },
    { x: SVX[1],       y: Math.round((s[0]+s[1])/2) },
    { x: SVX[0]-20,    y: Math.round((s[1]+s[2])/2) },
    { x: SVX[1],       y: s[2] },
    { x: hxR(0.10),    y: s[3] },
  ];
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`}>
      <CityGrid n={n} />
      <Path d={rD} fill="none" stroke={a} strokeWidth={4.5}
        strokeOpacity={0.44} strokeDasharray="12 7"
        strokeLinecap="round" strokeLinejoin="round" />
      {stops.map(({ x, y }, i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r={13} fill={a} fillOpacity={0.14} />
          <Circle cx={x} cy={y} r={6}  fill={a} fillOpacity={0.88} />
        </G>
      ))}
    </Svg>
  );
}

// Slide 3 – Подписчики (top 18 % left 5 %) · ❤️ Лайки (top 56 % right 3 %) · Отзывы (bottom 14 % left 8 %)
function ShareMap({ a, n }: { a: string; n: string }) {
  const s = SHY.map(y => y + ST / 2);
  const r1 = `M${SVX[2]},${s[0]} L${SVX[1]},${s[0]} L${SVX[1]},${s[2]} L${SVX[0]},${s[2]} L${SVX[0]},${s[3]}`;
  const r2 = `M${SVX[0]},${s[0]} L${SVX[0]},${s[1]} L${SVX[2]+ST},${s[1]} L${SVX[2]+ST},${s[2]} L${SVX[1]},${s[2]} L${SVX[1]},${s[3]}`;
  const r3 = `M${SVX[1]},${s[0]} L${SVX[1]},${s[1]} L${SVX[0]},${s[1]} L${SVX[0]},${s[2]} L${SVX[2]+ST},${s[2]} L${SVX[2]+ST},${VH}`;
  const heart = (cx: number, cy: number) =>
    `M${cx},${cy-5} C${cx-1},${cy-11} ${cx-9},${cy-11} ${cx-9},${cy-4} C${cx-9},${cy+3} ${cx},${cy+11} ${cx},${cy+12} C${cx},${cy+11} ${cx+9},${cy+3} ${cx+9},${cy-4} C${cx+9},${cy-11} ${cx+1},${cy-11} ${cx},${cy-5}`;
  const hearts: [number,number][] = [
    [hx(0.10), hy(0.18)], [hxR(0.06), hy(0.56)], [hx(0.13), hyB(0.14)],
  ];
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`}>
      <CityGrid n={n} />
      <Path d={r1} fill="none" stroke={a} strokeWidth={3.5} strokeOpacity={0.42} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={r2} fill="none" stroke={a} strokeWidth={3.5} strokeOpacity={0.26} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={r3} fill="none" stroke={a} strokeWidth={3.5} strokeOpacity={0.16} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={SVX[2]} cy={s[0]} r={9} fill={a} fillOpacity={0.65} />
      <Circle cx={SVX[0]} cy={s[0]} r={9} fill={a} fillOpacity={0.45} />
      <Circle cx={SVX[1]} cy={s[0]} r={9} fill={a} fillOpacity={0.30} />
      {hearts.map(([hcx, hcy]) =>
        <Path key={`h${hcx}${hcy}`} d={heart(hcx, hcy)} fill={a} fillOpacity={0.52} />
      )}
    </Svg>
  );
}

function MapIllustration({ slideKey, accent, neutral }: { slideKey: string; accent: string; neutral: string }) {
  if (slideKey === 'route') return <RouteMap a={accent} n={neutral} />;
  if (slideKey === 'share') return <ShareMap a={accent} n={neutral} />;
  return <DiscoverMap a={accent} n={neutral} />;
}

function SlideItem({ slide, c }: { slide: Slide; c: ThemeColors }) {
  const accentColor = c[slide.accentKey];

  return (
    <View style={[slideStyles.container, { width }]}>
      <View style={slideStyles.hero}>
        {/* Pulse rings */}
        <View style={[slideStyles.ringOuter, { borderColor: accentColor }]} />
        <View style={[slideStyles.ringInner, { borderColor: accentColor }]} />

        {/* Main icon box */}
        <View style={[slideStyles.iconBox, { backgroundColor: accentColor }]}>
          <Text style={slideStyles.emoji}>{slide.emoji}</Text>
        </View>

        {/* Floating chips */}
        {slide.chips.map((chip) => (
          <View
            key={chip.label}
            style={[
              slideStyles.chip,
              { backgroundColor: c.surface, shadowColor: c.shadow1 },
              chip.pos,
            ]}
          >
            <Text style={[Typography.cap, { color: c.text1 }]}>{chip.label}</Text>
          </View>
        ))}
      </View>

      {/* Copy */}
      <View style={slideStyles.copy}>
        <Text style={[Typography.display, { color: c.text1, fontSize: 38, textAlign: 'center' }]}>
          {slide.title}
        </Text>
        <Text style={[Typography.body, { color: c.text2, textAlign: 'center', marginTop: 12 }]}>
          {slide.subtitle}
        </Text>
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ringOuter: {
    position: 'absolute',
    width: 210, height: 210, borderRadius: 105,
    borderWidth: 1.5, opacity: 0.15,
  },
  ringInner: {
    position: 'absolute',
    width: 148, height: 148, borderRadius: 74,
    borderWidth: 1.5, opacity: 0.28,
  },
  iconBox: {
    width: 96, height: 96, borderRadius: Radius.card,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 42 },
  chip: {
    position: 'absolute',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Radius.pill,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
  },
  copy: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: Spacing.screen,
    alignItems: 'center',
  },
});

export default function Onboarding() {
  const c = useTheme();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
    },
    [],
  );

  const goNext = () => {
    flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      {/* Full-screen map layers – each fades in/out as the user swipes */}
      {SLIDES.map((slide, i) => {
        const opacity = scrollX.interpolate({
          inputRange: [(i - 1) * width, i * width, (i + 1) * width],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View key={slide.key} style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
            <MapIllustration slideKey={slide.key} accent={c[slide.accentKey]} neutral={c.text1} />
          </Animated.View>
        );
      })}

      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={[styles.logoSquare, { backgroundColor: c.text1 }]} />
        <Text style={[Typography.h2, { color: c.text1, marginLeft: 10 }]}>Explorit</Text>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => <SlideItem slide={item} c={c} />}
        style={{ flex: 1 }}
      />

      {/* Animated dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange, outputRange: [6, 22, 6], extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { backgroundColor: c.text1, width: dotWidth, opacity }]}
            />
          );
        })}
      </View>

      {/* CTA */}
      <View style={[styles.cta, { paddingHorizontal: Spacing.screen }]}>
        {isLast ? (
          <>
            <Button
              label="Начать"
              size="lg"
              block
              onPress={() => router.push('/(auth)/register')}
            />
            <Button
              label="У меня уже есть аккаунт"
              variant="ghost"
              size="lg"
              block
              onPress={() => router.push('/(auth)/login')}
              style={{ marginTop: 8 }}
            />
          </>
        ) : (
          <Button label="Далее" size="lg" block onPress={goNext} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  logoRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingTop: 16, paddingBottom: 8 },
  logoSquare:{ width: 28, height: 28, borderRadius: Radius.sm },
  dots:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 20 },
  dot:       { height: 6, borderRadius: 3 },
  cta:       { paddingBottom: 36 },
});
