import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { postsApi, profileApi } from '@/services/api';
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

function HeartIcon({ color, filled, size = 18 }: { color: string; filled?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
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

function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MoreIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
      <Circle cx={5} cy={12} r={1.5} fill={color} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
      <Circle cx={19} cy={12} r={1.5} fill={color} />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function XIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
  likes_count: number;
  is_liked?: boolean;
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

  const [editPostVisible, setEditPostVisible] = useState(false);
  const [editPostContent, setEditPostContent] = useState('');

  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

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
      setComments((prev) => [...prev, { ...data, author: commentAuthor, likes_count: 0 }]);
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

  const handleSavePost = async () => {
    if (!post || !editPostContent.trim()) return;
    const prev = post.content;
    setPost((p) => (p ? { ...p, content: editPostContent.trim() } : p));
    setEditPostVisible(false);
    try {
      await postsApi.update(id, editPostContent.trim());
    } catch {
      setPost((p) => (p ? { ...p, content: prev } : p));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setCommentMenuId(null);
    const prev = comments;
    setComments((cs) => cs.filter((cm) => cm.id !== commentId));
    setPost((p) => (p ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
    try {
      await postsApi.deleteComment(id, commentId);
    } catch {
      setComments(prev);
      setPost((p) => (p ? { ...p, comments_count: p.comments_count + 1 } : p));
    }
  };

  const startEditComment = (comment: Comment) => {
    setCommentMenuId(null);
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const saveEditComment = async (commentId: string) => {
    const trimmed = editingCommentContent.trim();
    if (!trimmed) return;
    const prev = comments;
    setComments((cs) =>
      cs.map((cm) => (cm.id === commentId ? { ...cm, content: trimmed } : cm)),
    );
    setEditingCommentId(null);
    try {
      await postsApi.updateComment(id, commentId, trimmed);
    } catch {
      setComments(prev);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    const comment = comments.find((cm) => cm.id === commentId);
    if (!comment) return;
    const wasLiked = comment.is_liked ?? false;
    setComments((cs) =>
      cs.map((cm) =>
        cm.id === commentId
          ? { ...cm, is_liked: !wasLiked, likes_count: cm.likes_count + (wasLiked ? -1 : 1) }
          : cm,
      ),
    );
    try {
      if (wasLiked) await postsApi.unlikeComment(id, commentId);
      else await postsApi.likeComment(id, commentId);
    } catch {
      setComments((cs) =>
        cs.map((cm) =>
          cm.id === commentId
            ? { ...cm, is_liked: wasLiked, likes_count: cm.likes_count + (wasLiked ? 1 : -1) }
            : cm,
        ),
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
  const isOwnPost = post?.author_id === user?.id;

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
          {isOwnPost ? (
            <TouchableOpacity
              onPress={() => {
                setEditPostContent(post?.content ?? '');
                setEditPostVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <PencilIcon color={c.text2} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 30 }} />
          )}
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.screen }}
          ListHeaderComponent={
            post ? (
              <View>
                <View style={[styles.postCard, { backgroundColor: c.surface }]}>
                  <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() =>
                      post.author_id === user?.id
                        ? router.push('/(tabs)/profile')
                        : router.push(`/user/${post.author_id}`)
                    }
                  >
                    <Avatar size={40} name={author?.nickname ?? '?'} uri={author?.avatar_url} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[Typography.bodyStrong, { color: c.text1 }]}>
                        @{author?.nickname ?? 'unknown'}
                      </Text>
                      <Text style={[Typography.micro, { color: c.text3 }]}>
                        {formatDate(post.created_at)} · {formatTime(post.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {editPostVisible ? (
                    <View style={{ marginTop: 14 }}>
                      <TextInput
                        style={[
                          styles.editCommentInput,
                          { backgroundColor: c.surface2, color: c.text1, borderColor: c.border, fontFamily: 'Manrope_400Regular', minHeight: 100 },
                        ]}
                        value={editPostContent}
                        onChangeText={setEditPostContent}
                        multiline
                        autoFocus
                        maxLength={2000}
                      />
                      <View style={styles.editCommentActions}>
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: c.surface2 }]}
                          onPress={() => setEditPostVisible(false)}
                        >
                          <XIcon color={c.text2} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: c.text1 }]}
                          onPress={handleSavePost}
                        >
                          <CheckIcon color={c.bg} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={[Typography.body, { color: c.text1, marginTop: 14, lineHeight: 22 }]}>
                      {post.content}
                    </Text>
                  )}

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
          renderItem={({ item }) => {
            const goToAuthor = () =>
              item.author_id === user?.id
                ? router.push('/(tabs)/profile')
                : router.push(`/user/${item.author_id}`);
            const canAct = item.author_id === user?.id || post?.author_id === user?.id;
            const commentLiked = item.is_liked ?? false;
            const commentLikeColor = commentLiked ? '#E74C3C' : c.text3;
            const isEditing = editingCommentId === item.id;

            return (
              <View style={styles.comment}>
                <TouchableOpacity onPress={goToAuthor} activeOpacity={0.7}>
                  <Avatar size={32} name={item.author?.nickname ?? '?'} uri={item.author?.avatar_url} />
                </TouchableOpacity>
                <View style={[styles.bubble, { backgroundColor: c.surface }]}>
                  <View style={styles.commentHeader}>
                    <TouchableOpacity onPress={goToAuthor} activeOpacity={0.7}>
                      <Text style={[Typography.cap, { color: c.text1, fontFamily: 'Manrope_700Bold' }]}>
                        @{item.author?.nickname ?? 'unknown'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[Typography.micro, { color: c.text3, marginLeft: 8, flex: 1 }]}>
                      {formatTime(item.created_at)}
                    </Text>
                    {canAct && !isEditing && (
                      <TouchableOpacity
                        onPress={() => setCommentMenuId(item.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <MoreIcon color={c.text3} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {isEditing ? (
                    <View style={{ marginTop: 6 }}>
                      <TextInput
                        style={[
                          styles.editCommentInput,
                          { backgroundColor: c.surface2, color: c.text1, borderColor: c.border, fontFamily: 'Manrope_400Regular' },
                        ]}
                        value={editingCommentContent}
                        onChangeText={setEditingCommentContent}
                        multiline
                        autoFocus
                      />
                      <View style={styles.editCommentActions}>
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: c.surface2 }]}
                          onPress={cancelEditComment}
                        >
                          <XIcon color={c.text2} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: c.text1 }]}
                          onPress={() => saveEditComment(item.id)}
                        >
                          <CheckIcon color={c.bg} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={[Typography.body, { color: c.text1, marginTop: 4 }]}>
                      {item.content}
                    </Text>
                  )}

                  {!isEditing && (
                    <View style={styles.commentFooter}>
                      <TouchableOpacity
                        style={styles.commentLikeBtn}
                        onPress={() => handleCommentLike(item.id)}
                        hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                      >
                        <HeartIcon color={commentLikeColor} filled={commentLiked} size={13} />
                        {item.likes_count > 0 && (
                          <Text style={[Typography.micro, { color: commentLikeColor, marginLeft: 3 }]}>
                            {item.likes_count}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
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

        {/* Comment action menu */}
        <Modal visible={commentMenuId !== null} transparent animationType="slide">
          <Pressable style={styles.overlay} onPress={() => setCommentMenuId(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: c.surface }]}>
              {(() => {
                const cm = comments.find((x) => x.id === commentMenuId);
                const isOwnComment = cm?.author_id === user?.id;
                return (
                  <>
                    {isOwnComment && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => cm && startEditComment(cm)}
                      >
                        <PencilIcon color={c.text1} />
                        <Text style={[Typography.body, { color: c.text1, marginLeft: 12 }]}>
                          Редактировать
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => commentMenuId && handleDeleteComment(commentMenuId)}
                    >
                      <TrashIcon color="#E74C3C" />
                      <Text style={[Typography.body, { color: '#E74C3C', marginLeft: 12 }]}>
                        Удалить
                      </Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </Pressable>
          </Pressable>
        </Modal>

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
  commentHeader: { flexDirection: 'row', alignItems: 'center' },
  commentFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  editCommentInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 10,
    minHeight: 56,
    maxHeight: 120,
    fontSize: 14,
    lineHeight: 20,
  },
  editCommentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: 20,
    paddingBottom: 36,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
});
