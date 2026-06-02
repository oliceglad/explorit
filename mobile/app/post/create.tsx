import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { postsApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';

export default function CreatePost() {
  const c = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await postsApi.create(content.trim());
      router.back();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.detail || 'Не удалось опубликовать');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[Typography.body, { color: c.text2 }]}>Закрыть</Text>
          </TouchableOpacity>
          <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Новый пост</Text>
          <Button label="Опубликовать" variant="primary" size="sm" loading={loading} onPress={publish} />
        </View>

        <View style={styles.identity}>
          <Avatar size={40} name={user?.nickname} uri={user?.avatar_url} />
          <View style={{ marginLeft: 12 }}>
            <Text style={[Typography.bodyStrong, { color: c.text1 }]}>{user?.nickname}</Text>
            <Text style={[Typography.micro, { color: c.text3 }]}>Видят все</Text>
          </View>
        </View>

        <TextInput
          style={[styles.textArea, { color: c.text1, fontFamily: 'Manrope_400Regular' }]}
          placeholder="Что нового?"
          placeholderTextColor={c.text3}
          multiline
          value={content}
          onChangeText={setContent}
          autoFocus
        />

        <View style={[styles.toolbar, { borderTopColor: c.border }]}>
          <TouchableOpacity style={styles.toolBtn}>
            <Text style={{ fontSize: 22 }}>🖼</Text>
            <Text style={[Typography.cap, { color: c.text2, marginLeft: 6 }]}>Фото</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <Text style={{ fontSize: 22 }}>📍</Text>
            <Text style={[Typography.cap, { color: c.text2, marginLeft: 6 }]}>Место</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <Text style={{ fontSize: 22 }}>🗺</Text>
            <Text style={[Typography.cap, { color: c.text2, marginLeft: 6 }]}>Маршрут</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 12, borderBottomWidth: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen, paddingVertical: 16 },
  textArea: { flex: 1, paddingHorizontal: Spacing.screen, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  toolbar: { flexDirection: 'row', paddingHorizontal: Spacing.screen, paddingVertical: 12, borderTopWidth: 1, gap: 20 },
  toolBtn: { flexDirection: 'row', alignItems: 'center' },
});
