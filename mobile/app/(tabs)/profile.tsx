import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Modal, TextInput, Switch, Image,
  ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { gamificationApi, profileApi, routesApi, uploadsApi, proxyUrl } from '@/services/api';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

interface Route {
  id: string;
  title?: string;
  description?: string;
  photo_url?: string;
  photos?: string[];
  distance_m?: number;
  duration_min?: number;
  transport_mode: string;
  is_public: boolean;
  is_saved: boolean;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  photo_url?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GearIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.75} />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function RouteIcon({ color, accent }: { color: string; accent: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M7 17c0-3.5 2-5.5 5-5.5S17 9 17 5.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx={7} cy={17} r={2.5} fill={accent} />
      <Circle cx={17} cy={5.5} r={2.5} fill={accent} />
    </Svg>
  );
}

function ChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EmptyRouteIcon({ color }: { color: string }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
      <Path d="M7 17c0-3.5 2-5.5 5-5.5S17 9 17 5.5" stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeOpacity={0.5} />
      <Circle cx={7} cy={17} r={2.5} stroke={color} strokeWidth={1.3} strokeOpacity={0.5} />
      <Circle cx={17} cy={5.5} r={2.5} stroke={color} strokeWidth={1.3} strokeOpacity={0.5} />
    </Svg>
  );
}

function EmptyPostIcon({ color }: { color: string }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={3} stroke={color} strokeWidth={1.3} strokeOpacity={0.5} />
      <Line x1={7} y1={8} x2={17} y2={8} stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeOpacity={0.5} />
      <Line x1={7} y1={12} x2={17} y2={12} stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeOpacity={0.5} />
      <Line x1={7} y1={16} x2={13} y2={16} stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeOpacity={0.5} />
    </Svg>
  );
}

function HeartIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Svg>
  );
}

function CommentIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Profile Route Card ───────────────────────────────────────────────────────

function ProfileRouteCard({
  route, onPress, onAddToPost, onPublish,
}: {
  route: Route;
  onPress: () => void;
  onAddToPost: () => void;
  onPublish: () => void;
}) {
  const c = useTheme();
  const distKm = ((route.distance_m ?? 0) / 1000).toFixed(1);
  const [imgErr, setImgErr] = useState(false);

  return (
    <TouchableOpacity style={[styles.routeCard, { backgroundColor: c.surface }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.routeThumb, { backgroundColor: c.surface2 }]}>
        {route.photo_url && !imgErr ? (
          <Image
            source={{ uri: proxyUrl(route.photo_url) }}
            style={styles.routeThumbImg}
            resizeMode="cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <RouteIcon color={c.text2} accent={c.accent} />
        )}
      </View>
      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        <Text style={[Typography.bodyStrong, { color: c.text1 }]} numberOfLines={1}>
          {route.title || 'Маршрут'}
        </Text>
        <Text style={[Typography.cap, { color: c.text2, marginTop: 2 }]}>
          {distKm} км · {route.duration_min ?? '?'} мин{route.is_public ? ' · Публичный' : ''}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={[styles.cardBtn, { backgroundColor: c.surface2 }]} onPress={onAddToPost}>
            <Text style={[Typography.micro, { color: c.text2 }]}>В пост</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cardBtn, { backgroundColor: c.accent + '20' }]} onPress={onPublish}>
            <Text style={[Typography.micro, { color: c.accent }]}>
              {route.is_public ? 'Изменить' : 'Опубликовать'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <ChevronIcon color={c.text3} />
    </TouchableOpacity>
  );
}

// ─── Profile Post Card ────────────────────────────────────────────────────────

function ProfilePostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const c = useTheme();
  const ago = React.useMemo(() => {
    const diff = (Date.now() - new Date(post.created_at).getTime()) / 1000;
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
    return `${Math.floor(diff / 86400)} д`;
  }, [post.created_at]);

  return (
    <TouchableOpacity style={[styles.postCard, { backgroundColor: c.surface }]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[Typography.micro, { color: c.text3, marginBottom: 6 }]}>{ago}</Text>
      <Text style={[Typography.body, { color: c.text1, lineHeight: 22 }]} numberOfLines={4}>
        {post.content}
      </Text>
      <View style={styles.postActions}>
        <View style={styles.postAction}>
          <HeartIcon color={post.is_liked ? '#E74C3C' : c.text3} filled={post.is_liked} />
          <Text style={[Typography.micro, { color: c.text3, marginLeft: 4 }]}>{post.likes_count}</Text>
        </View>
        <View style={styles.postAction}>
          <CommentIcon color={c.text3} />
          <Text style={[Typography.micro, { color: c.text3, marginLeft: 4 }]}>{post.comments_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user, logout, loadUser } = useAuthStore();

  const [progress, setProgress] = useState<any>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'routes' | 'posts'>('routes');

  // Publish sheet state
  const [publishRoute, setPublishRoute] = useState<Route | null>(null);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [publishPhotos, setPublishPhotos] = useState<string[]>([]);
  const [publishPublic, setPublishPublic] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);

  const loadData = useCallback(() => {
    loadUser().catch(() => {});
    gamificationApi.progress().then(({ data }) => setProgress(data)).catch(() => {});
    profileApi.archive().then(({ data }) => setRoutes(data)).catch(() => {});
  }, []);

  const loadPosts = useCallback(() => {
    if (!user?.id) return;
    profileApi.posts(user.id).then(({ data }) => {
      setPosts(Array.isArray(data) ? data : (data.items ?? []));
    }).catch(() => {});
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  useFocusEffect(useCallback(() => {
    loadPosts();
  }, [loadPosts]));

  const handleLogout = () =>
    Alert.alert('Выйти?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/onboarding');
        },
      },
    ]);

  const openPublish = (route: Route) => {
    setPublishRoute(route);
    setPublishTitle(route.title || '');
    setPublishDesc(route.description || '');
    setPublishPhotos(route.photos?.length ? route.photos : route.photo_url ? [route.photo_url] : []);
    setPublishPublic(route.is_public);
  };

  const closePublish = () => {
    setPublishRoute(null);
    setPublishTitle('');
    setPublishDesc('');
    setPublishPhotos([]);
    setPublishPublic(true);
  };

  const addPhoto = async () => {
    if (publishPhotos.length >= 5) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPublishPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPublishPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!publishRoute || !publishTitle.trim()) return;
    setPublishLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const uri of publishPhotos) {
        if (uri.startsWith('http')) {
          uploadedUrls.push(uri);
        } else {
          const { data } = await uploadsApi.postImage(uri);
          uploadedUrls.push(data.url);
        }
      }
      await routesApi.update(publishRoute.id, {
        title: publishTitle.trim(),
        description: publishDesc.trim() || undefined,
        photo_url: uploadedUrls[0] || undefined,
        photos: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        is_public: publishPublic,
        is_saved: true,
      });
      closePublish();
      loadData();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.detail || 'Не удалось сохранить');
    } finally {
      setPublishLoading(false);
    }
  };

  if (!user) return null;

  const displayName = user.full_name || user.nickname;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[Typography.h1, { color: c.text1 }]}>Профиль</Text>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: c.surface }]}
            onPress={() => router.push('/settings')}
          >
            <GearIcon color={c.text2} />
          </TouchableOpacity>
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <Avatar uri={proxyUrl(user.avatar_url)} name={user.nickname} size={84} />
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={[Typography.h2, { color: c.text1 }]}>{displayName}</Text>
            {user.full_name && (
              <Text style={[Typography.cap, { color: c.text3, marginTop: 1 }]}>@{user.nickname}</Text>
            )}
            {user.city && (
              <Text style={[Typography.cap, { color: c.text3, marginTop: 2 }]}>📍 {user.city}</Text>
            )}
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
            { label: 'Постов', value: posts.length },
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
          <TouchableOpacity
            style={[styles.xpBanner, { backgroundColor: c.text1 }]}
            onPress={() => router.push('/gamification')}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={[Typography.capUp, { color: c.accent }]}>Уровень {progress.level}</Text>
              <Text style={[Typography.bodyStrong, { color: c.bg, marginTop: 4 }]}>{progress.level_name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[Typography.cap, { color: `${c.bg}99` }]}>до {progress.level + 1}</Text>
              <Text style={[Typography.cap, { color: c.bg, marginTop: 2 }]}>{progress.xp} XP</Text>
              <Text style={[Typography.micro, { color: c.accent, marginTop: 4 }]}>Достижения →</Text>
            </View>
          </TouchableOpacity>
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
                {t === 'routes' ? `Маршруты ${routes.length}` : `Посты ${posts.length}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Routes tab */}
        {tab === 'routes' && (
          <View style={{ padding: Spacing.screen, gap: 10 }}>
            {routes.length === 0 ? (
              <View style={styles.empty}>
                <EmptyRouteIcon color={c.text3} />
                <Text style={[Typography.body, { color: c.text3, marginTop: 12, textAlign: 'center' }]}>
                  Нет маршрутов.{'\n'}Создай первый на вкладке «Карта»
                </Text>
              </View>
            ) : (
              routes.map((route) => (
                <ProfileRouteCard
                  key={route.id}
                  route={route}
                  onPress={() => router.push(`/route/${route.id}`)}
                  onAddToPost={() =>
                    router.push({
                      pathname: '/post/create',
                      params: { route_id: route.id, route_title: route.title || 'Маршрут' },
                    })
                  }
                  onPublish={() => openPublish(route)}
                />
              ))
            )}
          </View>
        )}

        {/* Posts tab */}
        {tab === 'posts' && (
          <View style={{ padding: Spacing.screen, gap: 10 }}>
            {posts.length === 0 ? (
              <View style={styles.empty}>
                <EmptyPostIcon color={c.text3} />
                <Text style={[Typography.body, { color: c.text3, marginTop: 12, textAlign: 'center' }]}>
                  Постов пока нет.{'\n'}Поделись своими впечатлениями!
                </Text>
              </View>
            ) : (
              posts.map((post) => (
                <ProfilePostCard
                  key={post.id}
                  post={post}
                  onPress={() => router.push(`/post/${post.id}`)}
                />
              ))
            )}
          </View>
        )}

        {/* Logout */}
        <View style={{ padding: Spacing.screen, marginTop: 8 }}>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: c.surface, borderColor: c.border2 }]}
            onPress={handleLogout}
          >
            <Text style={[Typography.bodyStrong, { color: c.danger }]}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Publish Modal */}
      <Modal visible={!!publishRoute} animationType="slide" presentationStyle="pageSheet" onRequestClose={closePublish}>
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: c.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={closePublish}>
              <Text style={[Typography.body, { color: c.text2 }]}>Отмена</Text>
            </TouchableOpacity>
            <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Добавить в маршруты</Text>
            <TouchableOpacity onPress={handlePublish} disabled={publishLoading || !publishTitle.trim()}>
              {publishLoading ? (
                <ActivityIndicator color={c.accent} size="small" />
              ) : (
                <Text style={[Typography.bodyStrong, { color: publishTitle.trim() ? c.accent : c.text3 }]}>
                  Сохранить
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              style={[styles.modalInput, { color: c.text1, borderBottomColor: c.border, fontFamily: 'Manrope_600SemiBold' }]}
              placeholder="Название маршрута *"
              placeholderTextColor={c.text3}
              value={publishTitle}
              onChangeText={setPublishTitle}
            />
            <TextInput
              style={[styles.modalTextArea, { color: c.text1, borderBottomColor: c.border, fontFamily: 'Manrope_400Regular' }]}
              placeholder="Описание (необязательно)"
              placeholderTextColor={c.text3}
              value={publishDesc}
              onChangeText={setPublishDesc}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.photosSection}>
              <Text style={[Typography.bodyStrong, { color: c.text1, marginBottom: 12 }]}>
                Фотографии {publishPhotos.length > 0 ? `(${publishPhotos.length}/5)` : '(до 5)'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.screen }}>
                <View style={[styles.photosRow, { paddingHorizontal: Spacing.screen }]}>
                  {publishPhotos.map((uri, i) => (
                    <TouchableOpacity key={i} onPress={() => removePhoto(i)} style={styles.photoSlotWrap}>
                      <Image source={{ uri: proxyUrl(uri) ?? uri }} style={[styles.photoSlot, { borderRadius: Radius.sm }]} />
                      <View style={styles.removePhotoOverlay}>
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>✕</Text>
                      </View>
                      {i === 0 && (
                        <View style={[styles.coverBadge, { backgroundColor: c.accent }]}>
                          <Text style={[Typography.micro, { color: '#fff' }]}>Обложка</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                  {publishPhotos.length < 5 && (
                    <TouchableOpacity
                      style={[styles.photoAdd, { backgroundColor: c.surface2, borderRadius: Radius.sm, borderColor: c.border2, borderWidth: 1 }]}
                      onPress={addPhoto}
                    >
                      <Text style={{ fontSize: 28, color: c.text3 }}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
            <View style={[styles.toggleRow, { borderTopColor: c.border, borderBottomColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Публичный маршрут</Text>
                <Text style={[Typography.cap, { color: c.text3, marginTop: 2 }]}>
                  {publishPublic ? 'Виден всем пользователям' : 'Только для вас'}
                </Text>
              </View>
              <Switch
                value={publishPublic}
                onValueChange={setPublishPublic}
                trackColor={{ false: c.surface2, true: c.accent }}
                thumbColor={Platform.OS === 'android' ? (publishPublic ? '#fff' : c.text3) : undefined}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingTop: 8, paddingBottom: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  statsGrid: { flexDirection: 'row', paddingVertical: 16 },
  stat: { flex: 1, alignItems: 'center' },
  xpBanner: { marginHorizontal: Spacing.screen, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.screen, borderBottomWidth: 1 },
  tab: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 20 },
  empty: { alignItems: 'center', padding: 40 },
  logoutBtn: { height: 50, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Route card
  routeCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: Radius.card,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  routeThumb: { width: 64, height: 64, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  routeThumbImg: { width: '100%', height: '100%' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cardBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },

  // Post card
  postCard: {
    padding: 14, borderRadius: Radius.card,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  postActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  postAction: { flexDirection: 'row', alignItems: 'center' },

  // Publish modal
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1 },
  modalInput: { paddingHorizontal: Spacing.screen, paddingVertical: 16, fontSize: 17, borderBottomWidth: 1 },
  modalTextArea: { paddingHorizontal: Spacing.screen, paddingVertical: 14, fontSize: 15, minHeight: 90, borderBottomWidth: 1 },
  photosSection: { paddingHorizontal: Spacing.screen, paddingVertical: 16 },
  photosRow: { flexDirection: 'row', gap: 10 },
  photoSlotWrap: { position: 'relative' },
  photoSlot: { width: 96, height: 96 },
  removePhotoOverlay: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  photoAdd: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, marginTop: 4 },
});
