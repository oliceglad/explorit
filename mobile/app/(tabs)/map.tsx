import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, SafeAreaView, Alert,
} from 'react-native';
import MapView, { Marker, Circle } from '@/components/ui/Map';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { routesApi } from '@/services/api';

const SAMARA = { latitude: 53.1959, longitude: 50.1002, latitudeDelta: 0.05, longitudeDelta: 0.05 };
const CATEGORIES = ['Кафе', 'Парки', 'Виды', 'Архитектура', 'Музыка'];

export default function MapScreen() {
  const c = useTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(3);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [transport, setTransport] = useState<'walking' | 'driving'>('walking');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setLocation(coords);
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.04, longitudeDelta: 0.04 });
    })();
  }, []);

  const toggleCategory = (cat: string) =>
    setActiveCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);

  const handleGenerate = async () => {
    const lat = location?.latitude ?? SAMARA.latitude;
    const lon = location?.longitude ?? SAMARA.longitude;
    setLoading(true);
    try {
      const { data } = await routesApi.generate({
        lat, lon,
        radius_km: radiusKm,
        categories: activeCategories.length ? activeCategories : undefined,
        transport_mode: transport,
        max_points: 5,
      });
      router.push(`/route/${data.id}?preview=1`);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.detail || 'Не удалось сгенерировать маршрут');
    } finally {
      setLoading(false);
    }
  };

  const speedKmh = transport === 'walking' ? 4.5 : 30;
  const durationMin = Math.round(radiusKm * 2 / speedKmh * 60);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={SAMARA}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {location && (
          <Circle
            center={location}
            radius={radiusKm * 1000}
            strokeColor={c.accentStrong}
            strokeWidth={1.5}
            fillColor={`${c.accent}18`}
          />
        )}
      </MapView>

      {/* Top search bar */}
      <SafeAreaView style={styles.topArea}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: c.surface }]}
            onPress={() => {}}
          >
            <Text style={{ fontSize: 16 }}>🔍</Text>
            <Text style={[Typography.body, { color: c.text3, marginLeft: 8, flex: 1 }]}>
              Куда отправимся?
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, { backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Quick chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ paddingHorizontal: Spacing.screen, gap: 8 }}>
          <Chip
            label={`${radiusKm} км`}
            variant="active"
          />
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              variant={activeCategories.includes(cat) ? 'active' : 'default'}
              onPress={() => toggleCategory(cat)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Side controls */}
      <View style={styles.sideControls}>
        {['📍', '🌍'].map((icon, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.sideBtn, { backgroundColor: c.surface }]}
            onPress={i === 0 ? () => {
              if (location) mapRef.current?.animateToRegion({ ...location, latitudeDelta: 0.02, longitudeDelta: 0.02 });
            } : undefined}
          >
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom sheet */}
      <View style={[styles.bottomSheet, { backgroundColor: c.surface }]}>
        <View style={[styles.grabber, { backgroundColor: c.border2 }]} />

        <View style={styles.sheetHeader}>
          <Text style={[Typography.cap, { color: c.text2 }]}>Радиус поиска</Text>
          <View style={styles.radiusRow}>
            <Text style={[Typography.h1, { color: c.text1, fontSize: 44 }]}>
              {radiusKm.toFixed(1)} <Text style={[Typography.h3, { color: c.text2 }]}>км</Text>
            </Text>
            <View style={styles.stats}>
              <Chip label={transport === 'walking' ? '🚶 Пешком' : '🚗 Авто'} variant="default" size="sm"
                onPress={() => setTransport(t => t === 'walking' ? 'driving' : 'walking')} />
              <Chip label={`~${durationMin} мин`} variant="default" size="sm" style={{ marginTop: 4 }} />
            </View>
          </View>
        </View>

        {/* Radius slider */}
        <View style={styles.sliderRow}>
          {[0.5, 2, 5, 7, 10].map((val) => (
            <TouchableOpacity key={val} onPress={() => setRadiusKm(val)} style={styles.sliderTick}>
              <View style={[styles.tick, { backgroundColor: radiusKm >= val ? c.text1 : c.surface3 }]} />
              <Text style={[Typography.micro, { color: c.text3, marginTop: 4 }]}>{val}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.sliderTrack, { backgroundColor: c.surface3 }]}>
          <View style={[styles.sliderFill, {
            backgroundColor: c.text1,
            width: `${((radiusKm - 0.5) / 9.5) * 100}%`,
          }]} />
        </View>

        <Button
          label="🎲  Сгенерировать точку"
          size="lg"
          block
          loading={loading}
          onPress={handleGenerate}
          style={{ marginTop: 20 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
  topRow: { flexDirection: 'row', paddingHorizontal: Spacing.screen, paddingTop: 8, gap: 8 },
  searchBar: {
    flex: 1, height: 48, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  filterBtn: {
    width: 48, height: 48, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  chips: { marginTop: 8 },
  sideControls: { position: 'absolute', right: 16, top: 200, gap: 8 },
  sideBtn: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.screen, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 28, elevation: 16,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetHeader: {},
  radiusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  stats: { alignItems: 'flex-end' },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 4 },
  sliderTick: { alignItems: 'center' },
  tick: { width: 2, height: 8, borderRadius: 1 },
  sliderTrack: { height: 6, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 3 },
});
