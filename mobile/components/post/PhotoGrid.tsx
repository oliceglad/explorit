import React, { useState, useRef } from 'react';
import {
  View, Image, TouchableOpacity, Modal, FlatList,
  Dimensions, StyleSheet, Animated, Text, Platform,
  StatusBar, SafeAreaView,
} from 'react-native';
import { proxyUrl } from '@/services/api';
import Svg, { Path } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const GAP = 2;

// ─── Close icon ───────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Full-screen viewer ───────────────────────────────────────────────────────

function PhotoViewer({
  photos, startIndex, onClose,
}: {
  photos: string[]; startIndex: number; onClose: () => void;
}) {
  const flatRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(startIndex);

  // Per-image zoom via Animated
  const scales = useRef(photos.map(() => new Animated.Value(1))).current;
  const lastTap = useRef<Record<number, number>>({});

  const handleTap = (index: number) => {
    const now = Date.now();
    const prev = lastTap.current[index] ?? 0;
    lastTap.current[index] = now;
    if (now - prev < 300) {
      // double-tap: toggle zoom
      const isZoomed = (scales[index] as any)._value > 1.5;
      Animated.spring(scales[index], {
        toValue: isZoomed ? 1 : 2.5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    if (idx !== current) {
      // Reset zoom on the previous image
      Animated.spring(scales[current], { toValue: 1, useNativeDriver: true }).start();
      setCurrent(idx);
    }
  };

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.viewerBg}>
        <StatusBar hidden />

        <FlatList
          ref={flatRef}
          data={photos}
          horizontal
          pagingEnabled
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: SW, offset: SW * i, index: i })}
          keyExtractor={(_, i) => String(i)}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => handleTap(index)}
              style={styles.viewerPage}
            >
              <Animated.Image
                source={{ uri: proxyUrl(item) ?? item }}
                style={[styles.viewerImage, { transform: [{ scale: scales[index] }] }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        />

        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <View style={styles.closeBtnBg}>
            <XIcon />
          </View>
        </TouchableOpacity>

        {/* Counter */}
        {photos.length > 1 && (
          <View style={styles.counterWrap}>
            <Text style={styles.counterText}>{current + 1} / {photos.length}</Text>
          </View>
        )}

        {/* Dot indicators */}
        {photos.length > 1 && photos.length <= 7 && (
          <View style={styles.dotsRow}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === current
                    ? { width: 16, opacity: 1 }
                    : { width: 6, opacity: 0.4 },
                ]}
              />
            ))}
          </View>
        )}

        {/* Zoom hint */}
        <Text style={styles.zoomHint}>Двойной тап — увеличить</Text>
      </View>
    </Modal>
  );
}

// ─── Photo grid ───────────────────────────────────────────────────────────────

interface PhotoGridProps {
  /** Array of raw keys or full URLs */
  photos: string[];
  style?: object;
}

export function PhotoGrid({ photos, style }: PhotoGridProps) {
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const open = (i: number) => setViewerIdx(i);
  const close = () => setViewerIdx(null);

  const Thumb = ({ index, thumbStyle }: { index: number; thumbStyle: object }) => (
    <TouchableOpacity
      style={[thumbStyle, { overflow: 'hidden' }]}
      onPress={() => open(index)}
      activeOpacity={0.88}
    >
      <Image
        source={{ uri: proxyUrl(photos[index]) ?? photos[index] }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const n = photos.length;

  const grid = () => {
    if (n === 1) {
      return (
        <View style={[{ aspectRatio: 4 / 3, borderRadius: 10, overflow: 'hidden' }, style]}>
          <Thumb index={0} thumbStyle={StyleSheet.absoluteFill} />
        </View>
      );
    }

    if (n === 2) {
      return (
        <View style={[{ flexDirection: 'row', gap: GAP, aspectRatio: 2, borderRadius: 10, overflow: 'hidden' }, style]}>
          <Thumb index={0} thumbStyle={{ flex: 1 }} />
          <Thumb index={1} thumbStyle={{ flex: 1 }} />
        </View>
      );
    }

    if (n === 3) {
      return (
        <View style={[{ gap: GAP }, style]}>
          <View style={{ aspectRatio: 16 / 9, borderRadius: 10, overflow: 'hidden' }}>
            <Thumb index={0} thumbStyle={StyleSheet.absoluteFill} />
          </View>
          <View style={{ flexDirection: 'row', gap: GAP, aspectRatio: 2, borderRadius: 10, overflow: 'hidden' }}>
            <Thumb index={1} thumbStyle={{ flex: 1 }} />
            <Thumb index={2} thumbStyle={{ flex: 1 }} />
          </View>
        </View>
      );
    }

    if (n === 4) {
      return (
        <View style={[{ gap: GAP }, style]}>
          <View style={{ flexDirection: 'row', gap: GAP, aspectRatio: 2, borderRadius: 10, overflow: 'hidden' }}>
            <Thumb index={0} thumbStyle={{ flex: 1 }} />
            <Thumb index={1} thumbStyle={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: GAP, aspectRatio: 2, borderRadius: 10, overflow: 'hidden' }}>
            <Thumb index={2} thumbStyle={{ flex: 1 }} />
            <Thumb index={3} thumbStyle={{ flex: 1 }} />
          </View>
        </View>
      );
    }

    // 5 photos
    return (
      <View style={[{ gap: GAP }, style]}>
        <View style={{ aspectRatio: 16 / 9, borderRadius: 10, overflow: 'hidden' }}>
          <Thumb index={0} thumbStyle={StyleSheet.absoluteFill} />
        </View>
        <View style={{ flexDirection: 'row', gap: GAP, aspectRatio: 2, borderRadius: 10, overflow: 'hidden' }}>
          <Thumb index={1} thumbStyle={{ flex: 1 }} />
          <Thumb index={2} thumbStyle={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: GAP, aspectRatio: 2, borderRadius: 10, overflow: 'hidden' }}>
          <Thumb index={3} thumbStyle={{ flex: 1 }} />
          <Thumb index={4} thumbStyle={{ flex: 1 }} />
        </View>
      </View>
    );
  };

  return (
    <>
      {grid()}
      {viewerIdx !== null && (
        <PhotoViewer photos={photos} startIndex={viewerIdx} onClose={close} />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  viewerBg: { flex: 1, backgroundColor: '#000' },
  viewerPage: {
    width: SW,
    height: SH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: { width: SW, height: SH },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
  },
  closeBtnBg: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  counterWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dotsRow: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    height: 6, borderRadius: 3, backgroundColor: '#fff',
  },
  zoomHint: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
});
