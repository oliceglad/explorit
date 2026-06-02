import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { postsApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';

export default function PostDetail() {
  const c = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      postsApi.get(id).then(({ data }) => setPost(data)),
      postsApi.comments(id).then(({ data }) => setComments(data)),
    ]).finally(() => setLoading(false));
  }, [id]);

  const sendComment = async () => {
    if (!text.trim()) return;
    try {
      const { data } = await postsApi.addComment(id, text.trim());
      setComments((prev) => [...prev, data]);
      setPost((p: any) => p ? { ...p, comments_count: p.comments_count + 1 } : p);
      setText('');
    } catch {}
  };

  if (loading) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator />
    </SafeAreaView>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[Typography.body, { color: c.text2 }]}>← Назад</Text>
          </TouchableOpacity>
          <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Пост</Text>
          <View style={{ width: 50 }} />
        </View>

        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: Spacing.screen }}
          ListHeaderComponent={
            post && (
              <View>
                {/* Post */}
                <View style={[styles.postCard, { backgroundColor: c.surface }]}>
                  <View style={styles.row}>
                    <Avatar size={36} name="User" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Пользователь</Text>
                      <Text style={[Typography.micro, { color: c.text3 }]}>
                        {new Date(post.created_at).toLocaleDateString('ru')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[Typography.body, { color: c.text1, marginTop: 12, lineHeight: 22 }]}>
                    {post.content}
                  </Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.action} onPress={() => postsApi.like(id)}>
                      <Text>♡ {post.likes_count}</Text>
                    </TouchableOpacity>
                    <Text style={[Typography.cap, { color: c.text3 }]}>💬 {post.comments_count}</Text>
                  </View>
                </View>

                <Text style={[Typography.capUp, { color: c.text3, marginTop: 20, marginBottom: 12 }]}>
                  Комментарии · {comments.length}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Avatar size={32} name="User" />
              <View style={[styles.bubble, { backgroundColor: c.surface2 }]}>
                <Text style={[Typography.cap, { color: c.text3, marginBottom: 4 }]}>
                  {new Date(item.created_at).toLocaleDateString('ru')}
                </Text>
                <Text style={[Typography.body, { color: c.text1 }]}>{item.content}</Text>
              </View>
            </View>
          )}
        />

        {/* Composer */}
        <View style={[styles.composer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <Avatar size={32} name={user?.nickname} uri={user?.avatar_url} />
          <TextInput
            style={[styles.composerInput, { backgroundColor: c.surface2, color: c.text1, fontFamily: 'Manrope_400Regular' }]}
            placeholder="Комментарий..."
            placeholderTextColor={c.text3}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: c.text1 }]}
            onPress={sendComment}
          >
            <Text style={{ color: c.bg, fontSize: 16 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 12, borderBottomWidth: 1 },
  postCard: { borderRadius: Radius.card, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  comment: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  bubble: { flex: 1, borderRadius: Radius.md, padding: 12 },
  composer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, gap: 10 },
  composerInput: { flex: 1, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 80 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
