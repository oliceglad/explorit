import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { gamificationApi, routesApi } from '@/services/api';

export default function ProfileScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [progress, setProgress] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [tab, setTab] = useState<'routes' | 'posts'>('routes');

  useEffect(() => {
    gamificationApi.progress().then(({ data }) => setProgress(data)).catch(() => {});
    routesApi.list().then(({ data }) => setRoutes(data)).catch(() => {});
  }, []);

  const handleLogout = () =>
    Alert.alert('Выйти?', '', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/onboarding'); } },
    ]);

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[Typography.h1, { color: c.text1 }]}>Профиль</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.surface }]}>
              <Text>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: c.surface }]}
              onPress={() => router.push('/settings')}
            >
              <Text>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <Avatar uri={user.avatar_url} name={user.nickname} size={84} />
          <View style={{ marginTop: 12 }}>
            <Text style={[Typography.h2, { color: c.text1, textAlign: 'center' }]}>{user.nickname}</Text>
            <Text style={[Typography.cap, { color: c.text3, textAlign: 'center', marginTop: 2 }]}>Самара</Text>
          </View>
          <Button
            label="Редактировать"
            variant="outline"
            size="sm"
            onPress={() => router.push('/edit-profile')}
            style={{ marginTop: 12 }}
          />
        </View>

        {/* Stats */}
        <View style={[styles.statsGrid, { backgroundColor: c.surface2, borderRadius: Radius.card, margin: Spacing.screen }]}>
          {[
            { label: 'Маршрутов', value: routes.length },
            { label: 'км пройдено', value: Math.round(routes.reduce((s, r) => s + (r.distance_m ?? 0), 0) / 1000) },
            { label: 'Уровень', value: progress?.level ?? 1 },
          ].map(({ label, value }) => (
            <View key={label} style={styles.stat}>
              <Text style={[Typography.h2, { color: c.text1 }]}>{value}</Text>
              <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* XP Banner */}
        {progress && (
          <View style={[styles.xpBanner, { backgroundColor: c.text1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.capUp, { color: c.accent }]}>Уровень {progress.level}</Text>
              <Text style={[Typography.bodyStrong, { color: c.bg, marginTop: 4 }]}>{progress.level_name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[Typography.cap, { color: `${c.bg}99` }]}>до {progress.level + 1}</Text>
              <Text style={[Typography.cap, { color: c.bg, marginTop: 2 }]}>{progress.xp} XP</Text>
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: c.border }]}>
          {(['routes', 'posts'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && { borderBottomWidth: 2, borderBottomColor: c.text1 }]}
            >
              <Text style={[Typography.bodyStrong, { color: tab === t ? c.text1 : c.text3 }]}>
                {t === 'routes' ? `Маршруты ${routes.length}` : 'Посты'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'routes' && routes.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36 }}>🗺</Text>
            <Text style={[Typography.body, { color: c.text3, marginTop: 8, textAlign: 'center' }]}>
              Нет маршрутов.{'\n'}Создай первый на вкладке «Карта»
            </Text>
          </View>
        )}

        {/* Logout */}
        <View style={{ padding: Spacing.screen, marginTop: 16 }}>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: c.surface, borderColor: c.border2 }]}
            onPress={handleLogout}
          >
            <Text style={[Typography.bodyStrong, { color: c.danger }]}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingTop: 8, paddingBottom: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  statsGrid: { flexDirection: 'row', paddingVertical: 16 },
  stat: { flex: 1, alignItems: 'center' },
  xpBanner: { marginHorizontal: Spacing.screen, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.screen, borderBottomWidth: 1 },
  tab: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 20 },
  empty: { alignItems: 'center', padding: 40 },
  logoutBtn: { height: 50, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
