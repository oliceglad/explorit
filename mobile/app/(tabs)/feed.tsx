import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, SafeAreaView, Modal, Pressable, Animated, TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { feedApi, postsApi, profileApi, notificationsApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import Svg, { Path, Circle } from 'react-native-svg';

// ─── Icons ────────────────────────────────────────────────────────────────────

function HeartIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round"
      />
    </Svg>
  );
}

function CommentIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShareIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M16 6l-4-4-4 4" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 2v13" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={10} cy={10} r={7} stroke={color} strokeWidth={1.75} />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function PenIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 20h9" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path
        d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx={5} cy={12} r={1.5} fill={color} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
      <Circle cx={19} cy={12} r={1.5} fill={color} />
    </Svg>
  );
}

function FlagIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M4 22v-7" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function EyeOffIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M1 1l22 22" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path
        d="M8 6V4h8v2M19 6l-1 14H6L5 6"
        stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function XIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function UserPlusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
        stroke={color} strokeWidth={1.75} strokeLinecap="round"
      />
      <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={1.75} />
      <Path d="M19 8v6M22 11h-6" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function EmptyIcon({ color }: { color: string }) {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color} strokeWidth={1.4} strokeLinejoin="round" strokeOpacity={0.4}
      />
    </Svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  author_id: string;
  content: string;
  photo_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked?: boolean;
  author?: { nickname: string; avatar_url?: string };
}

interface MenuState { postId: string; isOwn: boolean }

interface ActorInfo { id: string; nickname: string; avatar_url?: string }
interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow';
  entity_id?: string;
  entity_type?: string;
  is_read: boolean;
  created_at: string;
  actor?: ActorInfo;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  const c = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const bg = { backgroundColor: c.surface2 };
  return (
    <Animated.View style={[styles.card, { backgroundColor: c.surface, opacity }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.skeletonAvatar, bg]} />
        <View style={{ flex: 1, marginLeft: 10, gap: 7 }}>
          <View style={[styles.skeletonLine, { width: '40%' }, bg]} />
          <View style={[styles.skeletonLine, { width: '22%' }, bg]} />
        </View>
      </View>
      <View style={{ marginTop: 12, gap: 7 }}>
        <View style={[styles.skeletonLine, { width: '100%' }, bg]} />
        <View style={[styles.skeletonLine, { width: '88%' }, bg]} />
        <View style={[styles.skeletonLine, { width: '65%' }, bg]} />
      </View>
      <View style={[styles.actions, { marginTop: 14 }]}>
        <View style={[styles.skeletonLine, { width: 48 }, bg]} />
        <View style={[styles.skeletonLine, { width: 48 }, bg]} />
      </View>
    </Animated.View>
  );
}

// ─── Notification item ────────────────────────────────────────────────────────

const NOTIF_ICON_COLOR: Record<string, string> = {
  like: '#E74C3C',
  comment: '#3A82C2',
  follow: '#9B59B6',
};

const NOTIF_TEXT: Record<string, string> = {
  like: 'оценил(а) ваш пост',
  comment: 'прокомментировал(а) ваш пост',
  follow: 'подписался(лась) на вас',
};

function NotifIcon({ type }: { type: string }) {
  const color = NOTIF_ICON_COLOR[type] ?? '#888';
  if (type === 'like') return <HeartIcon color={color} filled />;
  if (type === 'comment') return <CommentIcon color={color} />;
  return <UserPlusIcon color={color} />;
}

function NotifItem({ notif }: { notif: Notification }) {
  const c = useTheme();
  const ago = React.useMemo(() => {
    const diff = (Date.now() - new Date(notif.created_at).getTime()) / 1000;
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
    return `${Math.floor(diff / 86400)} д`;
  }, [notif.created_at]);

  return (
    <View style={[styles.notifItem, !notif.is_read && { backgroundColor: c.surface2 }]}>
      <Avatar size={38} name={notif.actor?.nickname ?? '?'} uri={notif.actor?.avatar_url} />
      <View style={styles.notifIconBadge}>
        <NotifIcon type={notif.type} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[Typography.body, { color: c.text1 }]} numberOfLines={2}>
          <Text style={{ fontFamily: 'Manrope_700Bold' }}>
            @{notif.actor?.nickname ?? 'unknown'}
          </Text>
          {' '}{NOTIF_TEXT[notif.type] ?? notif.type}
        </Text>
        <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>{ago}</Text>
      </View>
    </View>
  );
}

// ─── Notifications sheet ──────────────────────────────────────────────────────

function NotificationsSheet({
  visible,
  notifications,
  onClose,
}: {
  visible: boolean;
  notifications: Notification[];
  onClose: () => void;
}) {
  const c = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <Pressable style={[styles.notifSheet, { backgroundColor: c.bg }]}>
          <View style={[styles.menuHandle, { backgroundColor: c.border }]} />
          <View style={styles.notifSheetHeader}>
            <Text style={[Typography.h2 ?? Typography.bodyStrong, { color: c.text1 }]}>
              Уведомления
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <XIcon color={c.text3} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={notifications}
            keyExtractor={(n) => n.id}
            renderItem={({ item }) => <NotifItem notif={item} />}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListEmptyComponent={
              <View style={styles.notifEmpty}>
                <BellIcon color={c.text3} />
                <Text style={[Typography.body, { color: c.text3, marginTop: 12 }]}>
                  Уведомлений пока нет
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Post menu ────────────────────────────────────────────────────────────────

function PostMenu({
  visible, isOwn, onReport, onHide, onDelete, onClose,
}: {
  visible: boolean; isOwn: boolean;
  onReport: () => void; onHide: () => void; onDelete: () => void; onClose: () => void;
}) {
  const c = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <Pressable style={[styles.menuSheet, { backgroundColor: c.surface }]}>
          <View style={[styles.menuHandle, { backgroundColor: c.border }]} />
          <TouchableOpacity style={styles.menuItem} onPress={onReport}>
            <FlagIcon color={c.text2} />
            <Text style={[Typography.body, { color: c.text1, marginLeft: 12 }]}>Пожаловаться</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onHide}>
            <EyeOffIcon color={c.text2} />
            <Text style={[Typography.body, { color: c.text1, marginLeft: 12 }]}>Больше не показывать</Text>
          </TouchableOpacity>
          {isOwn && (
            <>
              <View style={[styles.menuDivider, { backgroundColor: c.border }]} />
              <TouchableOpacity style={styles.menuItem} onPress={onDelete}>
                <TrashIcon color="#E74C3C" />
                <Text style={[Typography.body, { color: '#E74C3C', marginLeft: 12 }]}>Удалить</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post, onLike, onComment, onMore }: {
  post: Post; onLike: () => void; onComment: () => void; onMore: () => void;
}) {
  const c = useTheme();
  const router = useRouter();
  const ago = React.useMemo(() => {
    const diff = (Date.now() - new Date(post.created_at).getTime()) / 1000;
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
    return `${Math.floor(diff / 86400)} д`;
  }, [post.created_at]);

  const liked = post.is_liked ?? false;
  const likeColor = liked ? '#E74C3C' : c.text2;

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
            @{post.author?.nickname ?? 'unknown'}
          </Text>
          <Text style={[Typography.micro, { color: c.text3 }]}>{ago}</Text>
        </View>
        <TouchableOpacity onPress={onMore} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MoreIcon color={c.text3} />
        </TouchableOpacity>
      </View>
      <Text style={[Typography.body, { color: c.text1, marginTop: 10, lineHeight: 22 }]} numberOfLines={4}>
        {post.content}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={onLike}>
          <HeartIcon color={likeColor} filled={liked} />
          <Text style={[Typography.cap, { color: likeColor, marginLeft: 5 }]}>{post.likes_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={onComment}>
          <CommentIcon color={c.text2} />
          <Text style={[Typography.cap, { color: c.text2, marginLeft: 5 }]}>{post.comments_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
          <ShareIcon color={c.text2} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const c = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'following'>('all');
  const [menu, setMenu] = useState<MenuState | null>(null);

  // Search state
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Notifications state
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const cursorRef = useRef<string | undefined>(undefined);
  const loadingRef = useRef(false);
  const profileCacheRef = useRef<Record<string, { nickname: string; avatar_url?: string }>>({});

  // ── Profile enrichment ────────────────────────────────────────────────────

  const enrichWithProfiles = useCallback(async (data: Post[]): Promise<Post[]> => {
    const unknownIds = [...new Set<string>(data.map((p) => p.author_id))].filter(
      (id) => !profileCacheRef.current[id],
    );
    if (unknownIds.length > 0) {
      const results = await Promise.allSettled(unknownIds.map((id) => profileApi.get(id)));
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') profileCacheRef.current[unknownIds[i]] = res.value.data;
      });
    }
    return data.map((p) => ({ ...p, author: profileCacheRef.current[p.author_id] }));
  }, []);

  // ── Feed loading ──────────────────────────────────────────────────────────

  const loadPosts = useCallback(async (reset = false) => {
    if (loadingRef.current && !reset) return;
    loadingRef.current = true;
    if (reset) { cursorRef.current = undefined; setInitialLoading(true); }
    try {
      const { data } = tab === 'all'
        ? await feedApi.feed(cursorRef.current)
        : await feedApi.following(cursorRef.current);
      const enriched = await enrichWithProfiles(data);
      setPosts((prev) => {
        if (reset) return enriched;
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...enriched.filter((p) => !ids.has(p.id))];
      });
      if (data.length > 0) cursorRef.current = data[data.length - 1].id;
    } catch {}
    finally { loadingRef.current = false; setInitialLoading(false); }
  }, [tab, enrichWithProfiles]);

  useEffect(() => { loadPosts(true); }, [tab]);

  const refresh = async () => {
    setRefreshing(true);
    await loadPosts(true);
    setRefreshing(false);
  };

  // ── Search ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await feedApi.search(searchQuery.trim());
        const enriched = await enrichWithProfiles(data);
        setSearchResults(enriched);
      } catch {}
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, enrichWithProfiles]);

  const openSearch = () => {
    setSearchMode(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ── Notifications ─────────────────────────────────────────────────────────

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationsApi.unreadCount();
      setUnreadCount(data.count ?? 0);
    } catch {}
  }, [user]);

  useFocusEffect(useCallback(() => { fetchUnreadCount(); }, [fetchUnreadCount]));

  const handleOpenNotifications = async () => {
    setNotifOpen(true);
    try {
      const { data } = await notificationsApi.list();
      setNotifications(data);
      if (unreadCount > 0) {
        await notificationsApi.readAll();
        setUnreadCount(0);
      }
    } catch {}
  };

  // ── Like / post actions ───────────────────────────────────────────────────

  const handleLike = async (id: string) => {
    const updateList = (list: Post[], delta: number, liked: boolean) =>
      list.map((p) => p.id === id ? { ...p, is_liked: liked, likes_count: p.likes_count + delta } : p);
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const wasLiked = post.is_liked ?? false;
    setPosts((prev) => updateList(prev, wasLiked ? -1 : 1, !wasLiked));
    try {
      wasLiked ? await postsApi.unlike(id) : await postsApi.like(id);
    } catch {
      setPosts((prev) => updateList(prev, wasLiked ? 1 : -1, wasLiked));
    }
  };

  const handleReport = async () => {
    if (!menu) return;
    const id = menu.postId; setMenu(null);
    try { await postsApi.report(id, 'inappropriate'); } catch {}
  };

  const handleHide = () => {
    if (!menu) return;
    const id = menu.postId; setMenu(null);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDeletePost = async () => {
    if (!menu) return;
    const id = menu.postId; setMenu(null);
    try { await postsApi.delete(id); setPosts((prev) => prev.filter((p) => p.id !== id)); } catch {}
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const listData = searchMode ? searchResults : posts;
  const isListLoading = searchMode ? searchLoading : initialLoading;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>

      {/* Header */}
      {searchMode ? (
        <View style={[styles.header, styles.searchHeader]}>
          <View style={[styles.searchBar, { backgroundColor: c.surface2 }]}>
            <SearchIcon color={c.text3} />
            <TextInput
              ref={searchInputRef}
              style={[Typography.body, { flex: 1, color: c.text1, marginLeft: 8, paddingVertical: 0 }]}
              placeholder="Поиск постов..."
              placeholderTextColor={c.text3}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <XIcon color={c.text3} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={closeSearch} style={{ marginLeft: 12 }}>
            <Text style={[Typography.body, { color: c.accent ?? c.text2 }]}>Отмена</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <View>
            <Text style={[Typography.capUp, { color: c.text3 }]}>Лента</Text>
            <Text style={[Typography.h1, { color: c.text1, marginTop: 2 }]}>Что нового</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.surface }]} onPress={openSearch}>
              <SearchIcon color={c.text2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: c.surface }]}
              onPress={handleOpenNotifications}
            >
              <BellIcon color={c.text2} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs (hidden in search mode) */}
      {!searchMode && (
        <View style={[styles.tabs, { borderBottomColor: c.border }]}>
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
      )}

      {/* List */}
      {isListLoading ? (
        <View style={{ padding: Spacing.screen, gap: 12 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: Spacing.screen, gap: 12 }}
          refreshControl={
            searchMode ? undefined : <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          onEndReached={searchMode ? undefined : () => loadPosts()}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onLike={() => handleLike(item.id)}
              onComment={() => router.push(`/post/${item.id}`)}
              onMore={() => setMenu({ postId: item.id, isOwn: item.author_id === user?.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EmptyIcon color={c.text3} />
              <Text style={[Typography.body, { color: c.text3, marginTop: 12, textAlign: 'center' }]}>
                {searchMode
                  ? (searchQuery ? 'Ничего не найдено' : 'Введите запрос для поиска')
                  : tab === 'following'
                    ? 'Подпишитесь на кого-нибудь,\nчтобы видеть их посты'
                    : 'Пока нет постов'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      {!searchMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: c.text1 }]}
          onPress={() => router.push('/post/create')}
        >
          <PenIcon color={c.bg} />
        </TouchableOpacity>
      )}

      <PostMenu
        visible={!!menu}
        isOwn={menu?.isOwn ?? false}
        onReport={handleReport}
        onHide={handleHide}
        onDelete={handleDeletePost}
        onClose={() => setMenu(null)}
      />

      <NotificationsSheet
        visible={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.screen, paddingTop: 8, paddingBottom: 12,
  },
  searchHeader: { paddingVertical: 10 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.pill, paddingHorizontal: 12, height: 42,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'Manrope_700Bold' },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.screen, borderBottomWidth: 1 },
  tab: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 20 },
  card: {
    borderRadius: Radius.card, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', marginTop: 14, gap: 20 },
  action: { flexDirection: 'row', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  menuSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36,
  },
  menuHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  menuDivider: { height: 1, marginVertical: 4 },
  notifSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, maxHeight: '80%',
  },
  notifSheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  notifItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: Radius.md,
    marginHorizontal: 8, marginBottom: 4,
  },
  notifIconBadge: {
    position: 'absolute', left: 46, top: 10,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  notifEmpty: { alignItems: 'center', paddingTop: 48, paddingBottom: 24 },
  skeletonAvatar: { width: 36, height: 36, borderRadius: 18 },
  skeletonLine: { height: 12, borderRadius: 6 },
});
