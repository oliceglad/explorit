import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from '@/components/ui/Map';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Radius } from '@/constants/typography';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5" stroke="#111" strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M12 19l-7-7 7-7" stroke="#111" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapPinIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={color} strokeWidth={1.75} />
      <SvgCircle cx={12} cy={10} r={3} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

function ExternalIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
      <Path d="M15 3h6v6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 14L21 3" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlaceMapScreen() {
  const c = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lat: string; lon: string; name: string }>();

  const lat = parseFloat(params.lat ?? '55.7558');
  const lon = parseFloat(params.lon ?? '37.6173');
  const name = decodeURIComponent(params.name ?? 'Место');

  const openGoogleMaps = () => {
    Linking.openURL(`https://maps.google.com/?q=${lat},${lon}`);
  };

  const open2GIS = () => {
    const deepLink = Platform.OS === 'ios'
      ? `dgis://2gis.ru/geo/${lon},${lat}`
      : `dgis://2gis.ru/geo/${lon},${lat}`;
    Linking.canOpenURL(deepLink).then((ok) => {
      Linking.openURL(ok ? deepLink : `https://2gis.ru/geo/${lon},${lat}`);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen map */}
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
      >
        {/* Soft radius circle */}
        <Circle
          center={{ latitude: lat, longitude: lon }}
          radius={120}
          fillColor="rgba(231, 76, 60, 0.08)"
          strokeColor="rgba(231, 76, 60, 0.25)"
          strokeWidth={1}
        />
        {/* Pin */}
        <Marker
          coordinate={{ latitude: lat, longitude: lon }}
          title={name}
          pinColor="#E74C3C"
        />
      </MapView>

      {/* Back button overlay */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <BackIcon />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom card */}
      <SafeAreaView edges={['bottom']} style={styles.bottomOverlay} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          {/* Place name row */}
          <View style={styles.nameRow}>
            <View style={styles.pinCircle}>
              <MapPinIcon color="#fff" />
            </View>
            <Text style={[Typography.bodyStrong, { color: c.text1, flex: 1, marginLeft: 12 }]} numberOfLines={2}>
              {name}
            </Text>
          </View>

          <Text style={[Typography.micro, { color: c.text3, marginTop: 4, marginLeft: 52 }]}>
            {lat.toFixed(5)}, {lon.toFixed(5)}
          </Text>

          {/* Map links */}
          <View style={styles.linksRow}>
            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: '#4285F4' }]}
              onPress={openGoogleMaps}
            >
              <ExternalIcon />
              <Text style={styles.linkText}>Google Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: '#1CA44E' }]}
              onPress={open2GIS}
            >
              <ExternalIcon />
              <Text style={styles.linkText}>2ГИС</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
  },
  backBtn: {
    margin: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.93)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14, shadowRadius: 6, elevation: 5,
  },
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  card: {
    margin: 16, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14, shadowRadius: 16, elevation: 10,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  pinCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E74C3C',
    alignItems: 'center', justifyContent: 'center',
  },
  linksRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  linkBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 13, borderRadius: Radius.md,
  },
  linkText: {
    color: '#fff', fontSize: 13, fontFamily: 'Manrope_600SemiBold',
  },
});
