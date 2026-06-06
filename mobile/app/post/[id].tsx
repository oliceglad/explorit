import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { postsApi, profileApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M12 19l-7-7 7-7" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HeartIcon({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CommentIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SendIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M5 12l7-7 7 7" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthorProfile {
  id: string;
  nickname: string;
  avatar_url?: string;
}

interface Post {
  id: string;
  author_id: string;
  content: string;
  photo_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked?: boolean;
}

interface Comment {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: AuthorProfile;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PostDetail() {
  const c = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const profileCacheRef = useRef<Record<string, AuthorProfile>>({});

  const fetchProfile = async (userId: string): Promise<AuthorProfile | null> => {
    if (profileCacheRef.current[userId]) return profileCacheRef.current[userId];
    try {
      const { data } = await profileApi.get(userId);
      profileCacheRef.current[userId] = data;
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: postData }, { data: commentsData }] = await Promise.all([
          postsApi.get(id),
          postsApi.comments(id),
        ]);

        // Fetch post author + all comment authors in parallel
        const authorIds = [postData.author_id, ...commentsData.map((cm: Comment) => cm.author_id)];
        const uniqueIds = [...new Set<string>(authorIds)];
        await Promise.allSettled(uniqueIds.map(fetchProfile));

        setPost(postData);
        setAuthor(profileCacheRef.current[postData.author_id] ?? null);
        setComments(
          commentsData.map((cm: Comment) => ({
            ...cm,
            author: profileCacheRef.current[cm.author_id],
          })),
        );
      } catch {}
      finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const sendComment = async () => {
    if (!text.trim()) return;
    try {
      const { data } = await postsApi.addComment(id, text.trim());
      const commentAuthor = user
        ? { id: user.id, nickname: user.nickname, avatar_url: user.avatar_url }
        : undefined;
      setComments((prev) => [...prev, { ...data, author: commentAuthor }]);
      setPost((p) => (p ? { ...p, comments_count: p.comments_count + 1 } : p));
      setText('');
    } catch {}
  };

  const handleLike = async () => {
    if (!post) return;
    const wasLiked = post.is_liked ?? false;
    setPost((p) =>
      p ? { ...p, is_liked: !wasLiked, likes_count: p.likes_count + (wasLiked ? -1 : 1) } : p,
    );
    try {
      if (wasLiked) await postsApi.unlike(id);
      else await postsApi.like(id);
    } catch {
      setPost((p) =>
        p ? { ...p, is_liked: wasLiked, likes_count: p.likes_count + (wasLiked ? 1 : -1) } : p,
      );
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={c.text2} />
      </SafeAreaView>
    );
  }

  const liked = post?.is_liked ?? false;
  const likeColor = liked ? '#E74C3C' : c.text2;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BackIcon color={c.text2} />
          </TouchableOpacity>
          <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Пост</Text>
          <View style={{ width: 30 }} />
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.screen }}
          ListHeaderComponent={
            post ? (
              <View>
                {/* Post card */}
                <View style={[styles.postCard, { backgroundColor: c.surface }]}>
                  <View style={styles.row}>
                    <Avatar size={40} name={author?.nickname ?? '?'} uri={author?.avatar_url} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[Typography.bodyStrong, { color: c.text1 }]}>
                        @{author?.nickname ?? 'unknown'}
                      </Text>
                      <Text style={[Typography.micro, { color: c.text3 }]}>
                        {formatDate(post.created_at)} · {formatTime(post.created_at)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[Typography.body, { color: c.text1, marginTop: 14, lineHeight: 22 }]}>
                    {post.content}
                  </Text>

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.action} onPress={handleLike}>
                      <HeartIcon color={likeColor} filled={liked} />
                      <Text style={[Typography.cap, { color: likeColor, marginLeft: 5 }]}>
                        {post.likes_count}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.action}>
                      <CommentIcon color={c.text2} />
                      <Text style={[Typography.cap, { color: c.text2, marginLeft: 5 }]}>
                        {post.comments_count}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[Typography.capUp, { color: c.text3, marginTop: 20, marginBottom: 12 }]}>
                  Комментарии · {comments.length}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Avatar size={32} name={item.author?.nickname ?? '?'} uri={item.author?.avatar_url} />
              <View style={[styles.bubble, { backgroundColor: c.surface }]}>
                <View style={styles.row}>
                  <Text style={[Typography.cap, { color: c.text1, fontFamily: 'Manrope_700Bold' }]}>
                    @{item.author?.nickname ?? 'unknown'}
                  </Text>
                  <Text style={[Typography.micro, { color: c.text3, marginLeft: 8 }]}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
                <Text style={[Typography.body, { color: c.text1, marginTop: 4 }]}>
                  {item.content}
                </Text>
              </View>
            </View>
          )}
        />

        {/* Composer */}
        <View style={[styles.composer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <Avatar size={32} name={user?.nickname} uri={user?.avatar_url} />
          <TextInput
            style={[
              styles.composerInput,
              { backgroundColor: c.surface2, color: c.text1, fontFamily: 'Manrope_400Regular' },
            ]}
            placeholder="Комментарий..."
            placeholderTextColor={c.text3}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: c.text1, opacity: text.trim() ? 1 : 0.4 }]}
            onPress={sendComment}
            disabled={!text.trim()}
          >
            <SendIcon color={c.bg} />
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  postCard: { borderRadius: Radius.card, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 20, marginTop: 14 },
  action: { flexDirection: 'row', alignItems: 'center' },
  comment: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  bubble: { flex: 1, borderRadius: Radius.md, padding: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  composerInput: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
