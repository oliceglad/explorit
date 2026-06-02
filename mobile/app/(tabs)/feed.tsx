import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, SafeAreaView, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { feedApi, postsApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';

interface Post {
  id: string;
  author_id: string;
  content: string;
  photo_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: { nickname: string; avatar_url?: string };
}

function PostCard({ post, onLike, onComment }: { post: Post; onLike: () => void; onComment: () => void }) {
  const c = useTheme();
  const router = useRouter();
  const ago = React.useMemo(() => {
    const diff = (Date.now() - new Date(post.created_at).getTime()) / 1000;
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
    return `${Math.floor(diff / 86400)} д`;
  }, [post.created_at]);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.surface }]}
      onPress={() => router.push(`/post/${post.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <Avatar name={post.author?.nickname ?? '?'} uri={post.author?.avatar_url} size={36} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[Typography.bodyStrong, { color: c.text1 }]}>
            {post.author?.nickname ?? 'Пользователь'}
          </Text>
          <Text style={[Typography.micro, { color: c.text3 }]}>{ago}</Text>
        </View>
        <TouchableOpacity><Text style={{ color: c.text3, fontSize: 18 }}>···</Text></TouchableOpacity>
      </View>

      <Text style={[Typography.body, { color: c.text1, marginTop: 10, lineHeight: 22 }]} numberOfLines={4}>
        {post.content}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={onLike}>
          <Text style={{ fontSize: 16 }}>♡</Text>
          <Text style={[Typography.cap, { color: c.text2, marginLeft: 4 }]}>{post.likes_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={onComment}>
          <Text style={{ fontSize: 16 }}>💬</Text>
          <Text style={[Typography.cap, { color: c.text2, marginLeft: 4 }]}>{post.comments_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
          <Text style={{ fontSize: 16 }}>↗</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const c = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [tab, setTab] = useState<'all' | 'following'>('all');

  const loadPosts = useCallback(async (reset = false) => {
    try {
      const c = reset ? undefined : cursor;
      const { data } = tab === 'all' ? await feedApi.feed(c) : await feedApi.following(c);
      setPosts((prev) => reset ? data : [...prev, ...data]);
      if (data.length > 0) setCursor(data[data.length - 1].id);
    } catch {}
  }, [tab, cursor]);

  useEffect(() => {
    setCursor(undefined);
    loadPosts(true);
  }, [tab]);

  const refresh = async () => {
    setRefreshing(true);
    setCursor(undefined);
    await loadPosts(true);
    setRefreshing(false);
  };

  const handleLike = async (id: string) => {
    try {
      await postsApi.like(id);
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, likes_count: p.likes_count + 1 } : p));
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[Typography.capUp, { color: c.text3 }]}>Лента</Text>
          <Text style={[Typography.h1, { color: c.text1, marginTop: 2 }]}>Что нового</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.surface }]}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['all', 'following'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { borderBottomWidth: 2, borderBottomColor: c.text1 }]}
          >
            <Text style={[Typography.bodyStrong, { color: tab === t ? c.text1 : c.text3 }]}>
              {t === 'all' ? 'Все' : 'Подписки'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: Spacing.screen, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={() => loadPosts()}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={() => handleLike(item.id)}
            onComment={() => router.push(`/post/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={[Typography.body, { color: c.text3, marginTop: 12, textAlign: 'center' }]}>
              {tab === 'following' ? 'Подпишитесь на кого-нибудь,\nчтобы видеть их посты' : 'Пока нет постов'}
            </Text>
          </View>
        }
      />

      {/* FAB — создать пост */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: c.text1 }]}
        onPress={() => router.push('/post/create')}
      >
        <Text style={{ color: c.bg, fontSize: 24 }}>✏️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingTop: 8, paddingBottom: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.screen, borderBottomWidth: 1 },
  tab: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 20 },
  card: { borderRadius: Radius.card, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', marginTop: 14, gap: 20 },
  action: { flexDirection: 'row', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
});
