import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert } from 'react-native';
import MapView, { Marker } from '@/components/ui/Map';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { WS_BASE_URL } from '@/constants/api';
import { getItemAsync } from '@/utils/storage';

const COLORS = ['#FF5733', '#33A8FF', '#33FF57', '#FF33A8', '#FFD700'];

interface Participant { user_id: string; nickname: string; color: string; lat?: number; lon?: number; }

export default function CoopMap() {
  const c = useTheme();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const mapRef = useRef<MapView>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;

    const connect = async () => {
      const token = await getItemAsync('access_token');
      if (!token) return;

      const ws = new WebSocket(`${WS_BASE_URL}/session/${code}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = () => Alert.alert('Ошибка', 'Не удалось подключиться к сессии');

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'location') {
            setParticipants((prev) => {
              const idx = prev.findIndex((p) => p.user_id === msg.payload.user_id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], lat: msg.payload.lat, lon: msg.payload.lon };
                return updated;
              }
              return prev;
            });
          } else if (msg.type === 'joined') {
            setParticipants((prev) => [
              ...prev,
              { user_id: msg.payload.user_id, nickname: msg.payload.nickname, color: msg.payload.color },
            ]);
          } else if (msg.type === 'left') {
            setParticipants((prev) => prev.filter((p) => p.user_id !== msg.payload.user_id));
          } else if (msg.type === 'checkpoint') {
            Alert.alert('Точка достигнута! 🎯', `${msg.payload.point_name}\n+${msg.payload.xp_awarded} XP`);
          } else if (msg.type === 'route_completed') {
            Alert.alert('Маршрут завершён! 🎉', `${msg.payload.distance_km} км · ${msg.payload.total_xp} XP`, [
              { text: 'Отлично!', onPress: () => router.back() },
            ]);
          }
        } catch {}
      };

      // Send location every 2 seconds
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        locationSub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
          (loc) => {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setMyLocation(coords);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'location', payload: { lat: loc.coords.latitude, lon: loc.coords.longitude } }));
            }
          }
        );
      }
    };

    connect();
    return () => {
      wsRef.current?.send(JSON.stringify({ type: 'leave', payload: {} }));
      wsRef.current?.close();
      locationSub?.remove();
    };
  }, [code]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        initialRegion={myLocation ? { ...myLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 } : undefined}
      >
        {participants.filter((p) => p.lat && p.lon).map((p, i) => (
          <Marker
            key={p.user_id}
            coordinate={{ latitude: p.lat!, longitude: p.lon! }}
            title={p.nickname}
            pinColor={p.color}
          />
        ))}
      </MapView>

      {/* Top */}
      <SafeAreaView style={styles.topArea}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: c.surface }]}
            onPress={() => router.back()}
          >
            <Text style={[Typography.body, { color: c.text1 }]}>← Назад</Text>
          </TouchableOpacity>
          <View style={[styles.statusPill, { backgroundColor: c.surface }]}>
            <View style={[styles.dot, { backgroundColor: connected ? c.accent : c.danger }]} />
            <Text style={[Typography.cap, { color: c.text1, marginLeft: 6 }]}>
              {connected ? `${participants.length + 1} идут` : 'Подключение...'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { backgroundColor: c.surface }]}>
        <View style={[styles.grabber, { backgroundColor: c.border2 }]} />

        <View style={styles.sheetHeader}>
          <View style={[styles.livePill, { backgroundColor: c.accentSoft }]}>
            <View style={[styles.pulseDot, { backgroundColor: c.accent }]} />
            <Text style={[Typography.cap, { color: c.accentStrong, marginLeft: 4 }]}>совместно</Text>
          </View>
          <Text style={[Typography.micro, { color: c.text3, marginLeft: 8 }]}>сессия #{code.slice(-6)}</Text>
        </View>

        <Text style={[Typography.h2, { color: c.text1, marginTop: 8 }]}>Совместный маршрут</Text>

        {/* Participants */}
        <FlatList
          data={participants}
          keyExtractor={(p) => p.user_id}
          style={{ marginTop: 16, maxHeight: 160 }}
          renderItem={({ item }) => (
            <View style={styles.participantRow}>
              <View style={{ position: 'relative' }}>
                <Avatar size={36} name={item.nickname} />
                <View style={[styles.onlineDot, { backgroundColor: item.lat ? c.accent : c.surface3 }]} />
              </View>
              <Text style={[Typography.bodyStrong, { color: c.text1, marginLeft: 10, flex: 1 }]}>{item.nickname}</Text>
              <Text style={[Typography.micro, { color: c.text3 }]}>{item.lat ? 'в сети' : 'офлайн'}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[Typography.cap, { color: c.text3 }]}>Ждём участников...</Text>
          }
          ItemSeparatorComponent={() => <View style={[{ height: 1, backgroundColor: c.border, marginVertical: 2 }]} />}
        />

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.outlineBtn, { borderColor: c.border2 }]}>
            <Text style={[Typography.bodyStrong, { color: c.text1 }]}>📞 Звонок</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: c.danger, flex: 1, marginLeft: 8 }]}
            onPress={() => { wsRef.current?.close(); router.back(); }}
          >
            <Text style={[Typography.bodyStrong, { color: c.danger }]}>Выйти из сессии</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingTop: 8 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sheet: { borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet, padding: Spacing.screen, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 28 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  livePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  participantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  actionRow: { flexDirection: 'row', marginTop: 16 },
  outlineBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
