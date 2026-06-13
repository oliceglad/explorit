import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { profileApi, proxyUrl } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import Svg, { Path, Circle } from 'react-native-svg';

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M12 19l-7-7 7-7" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UserCheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={1.75} />
      <Path d="M16 11l2 2 4-4" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UserPlusIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={1.75} />
      <Path d="M19 8v6M22 11h-6" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function CommentIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Svg>
  );
}

function HeartIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url?: string;
  bio?: string;
  interests: string[];
  followers_count: number;
  following_count: number;
  is_following?: boolean | null;
}

interface Post {
  id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked?: boolean;
}

// ─── Mini post card ───────────────────────────────────────────────────────────

function MiniPostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const c = useTheme();
  const ago = React.useMemo(() => {
    const diff = (Date.now() - new Date(post.created_at).getTime()) / 1000;
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
    return `${Math.floor(diff / 86400)} д`;
  }, [post.created_at]);

  return (
    <TouchableOpacity
      style={[styles.miniCard, { backgroundColor: c.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[Typography.body, { color: c.text1, lineHeight: 22 }]} numberOfLines={3}>
        {post.content}
      </Text>
      <View style={styles.miniCardFooter}>
        <View style={styles.miniStat}>
          <HeartIcon color={c.text3} />
          <Text style={[Typography.micro, { color: c.text3, marginLeft: 4 }]}>{post.likes_count}</Text>
        </View>
        <View style={styles.miniStat}>
          <CommentIcon color={c.text3} />
          <Text style={[Typography.micro, { color: c.text3, marginLeft: 4 }]}>{post.comments_count}</Text>
        </View>
        <Text style={[Typography.micro, { color: c.text3, marginLeft: 'auto' }]}>{ago}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Profile header ───────────────────────────────────────────────────────────

function ProfileHeader({
  profile,
  isOwnProfile,
  onFollow,
  onEditProfile,
}: {
  profile: UserProfile;
  isOwnProfile: boolean;
  onFollow: () => void;
  onEditProfile: () => void;
}) {
  const c = useTheme();
  const following = profile.is_following ?? false;

  return (
    <View style={styles.profileHeader}>
      <Avatar size={84} name={profile.nickname} uri={proxyUrl(profile.avatar_url)} />

      <Text style={[Typography.h2, { color: c.text1, marginTop: 14, textAlign: 'center' }]}>
        @{profile.nickname}
      </Text>

      {profile.bio ? (
        <Text style={[Typography.body, { color: c.text2, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 }]}>
          {profile.bio}
        </Text>
      ) : null}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[Typography.h3, { color: c.text1 }]}>{profile.followers_count}</Text>
          <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>подписчика</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <View style={styles.statItem}>
          <Text style={[Typography.h3, { color: c.text1 }]}>{profile.following_count}</Text>
          <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>подписок</Text>
        </View>
      </View>

      {/* Action button */}
      {isOwnProfile ? (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: c.surface2, borderColor: c.border }]}
          onPress={onEditProfile}
        >
          <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Редактировать</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.actionBtn,
            following
              ? { backgroundColor: c.surface2, borderColor: c.border }
              : { backgroundColor: c.text1 },
          ]}
          onPress={onFollow}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {following
              ? <UserCheckIcon color={c.text2} />
              : <UserPlusIcon color={c.bg} />}
            <Text style={[Typography.bodyStrong, { color: following ? c.text2 : c.bg }]}>
              {following ? 'Подписан(а)' : 'Подписаться'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Interests */}
      {profile.interests.length > 0 && (
        <View style={styles.interestsRow}>
          {profile.interests.slice(0, 5).map((interest) => (
            <View key={interest} style={[styles.interestChip, { backgroundColor: c.surface2 }]}>
              <Text style={[Typography.micro, { color: c.text2 }]}>{interest}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[Typography.capUp, { color: c.text3, alignSelf: 'flex-start', marginTop: 20, marginLeft: 2 }]}>
        Посты
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const c = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const cursorRef = useRef<string | undefined>(undefined);
  const postsLoadingRef = useRef(false);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: profileData }, { data: postsData }] = await Promise.all([
          profileApi.get(id),
          profileApi.posts(id),
        ]);
        setProfile(profileData);
        setPosts(postsData);
        if (postsData.length > 0) cursorRef.current = postsData[postsData.length - 1].id;
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const loadMorePosts = useCallback(async () => {
    if (postsLoadingRef.current || !cursorRef.current) return;
    postsLoadingRef.current = true;
    try {
      const { data } = await profileApi.posts(id, cursorRef.current);
      if (data.length > 0) {
        setPosts((prev) => {
          const existing = new Set(prev.map((p) => p.id));
          return [...prev, ...data.filter((p: Post) => !existing.has(p.id))];
        });
        cursorRef.current = data[data.length - 1].id;
      } else {
        cursorRef.current = undefined;
      }
    } catch {}
    finally { postsLoadingRef.current = false; }
  }, [id]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    const wasFollowing = profile.is_following ?? false;
    setFollowLoading(true);

    setProfile((p) => p ? {
      ...p,
      is_following: !wasFollowing,
      followers_count: p.followers_count + (wasFollowing ? -1 : 1),
    } : p);

    try {
      if (wasFollowing) {
        await profileApi.unfollow(id);
      } else {
        await profileApi.follow(id);
      }
    } catch {
      setProfile((p) => p ? {
        ...p,
        is_following: wasFollowing,
        followers_count: p.followers_count + (wasFollowing ? 1 : -1),
      } : p);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={c.text2} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon color={c.text2} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[Typography.body, { color: c.text3 }]}>Профиль не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      {/* Header bar */}
      <View style={[styles.headerBar, { borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <BackIcon color={c.text2} />
        </TouchableOpacity>
        <Text style={[Typography.bodyStrong, { color: c.text1 }]}>@{profile.nickname}</Text>
        <View style={{ width: 30 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.screen, paddingBottom: 32, gap: 10 }}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <ProfileHeader
            profile={profile}
            isOwnProfile={isOwnProfile}
            onFollow={handleFollow}
            onEditProfile={() => router.push('/edit-profile')}
          />
        }
        renderItem={({ item }) => (
          <MiniPostCard
            post={item}
            onPress={() => router.push(`/post/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <Text style={[Typography.body, { color: c.text3, textAlign: 'center' }]}>
              Постов пока нет
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: Spacing.screen },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  statItem: { alignItems: 'center', paddingHorizontal: 28 },
  statDivider: { width: 1, height: 28 },
  actionBtn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  miniCard: {
    borderRadius: Radius.card,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  miniCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  miniStat: { flexDirection: 'row', alignItems: 'center' },
  emptyPosts: { paddingTop: 32, paddingBottom: 16 },
});
