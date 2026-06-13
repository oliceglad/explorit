import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radius } from '@/constants/typography';
import { Avatar } from '@/components/ui/Avatar';
import { gamificationApi, proxyUrl } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';

// ─── Constants (mirrors backend) ──────────────────────────────────────────────

const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2200, 3100, 4200, 5500,
  7000, 8800, 11000, 13500, 16500, 20000, 24000, 28500, 33500, 39000,
];

const LEVEL_NAMES: Record<number, string> = {
  1: 'Новый житель',
  2: 'Любопытный горожанин',
  3: 'Исследователь улиц',
  5: 'Знаток района',
  8: 'Самарский пешеход',
  12: 'Хранитель города',
  16: 'Легенда Самары',
  20: 'Мастер маршрутов',
};

function getLevelName(level: number): string {
  const keys = Object.keys(LEVEL_NAMES).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (level >= k) return LEVEL_NAMES[k];
  }
  return LEVEL_NAMES[1];
}

const CHALLENGE_ICONS: Record<string, string> = {
  c1: '🗺', c2: '✍️', c3: '🔥', c4: '🧭', c5: '🏃',
  c6: '⭐', c7: '🤝', c8: '📖', c9: '👥', c10: '🌍',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Progress {
  xp: number; level: number; level_name: string;
  routes_completed: number; places_discovered: number;
  distance_walked_km: number; current_streak: number;
}

interface LeaderboardEntry {
  user_id: string; nickname: string; avatar_url?: string;
  xp: number; level: number; rank: number;
}

interface Challenge {
  id: string; title: string; description: string;
  xp_reward: number; is_completed?: boolean;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M12 19l-7-7 7-7" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrophyIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 21h8M12 17v4M17 3H7v8a5 5 0 0010 0V3z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 4h3a1 1 0 011 1v2a4 4 0 01-4 4M7 4H4a1 1 0 00-1 1v2a4 4 0 004 4" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

function StarIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} />
    </Svg>
  );
}

function ZapIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} stroke={color} strokeWidth={2} />
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CheckCircle({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={color} />
      <Path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  const c = useTheme();
  return (
    <View style={[statPillStyle.wrap, { backgroundColor: c.surface2 }]}>
      <Text style={[Typography.h3, { color: accent }]}>{value}</Text>
      <Text style={[Typography.micro, { color: c.text3, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

const statPillStyle = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.md },
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'leaderboard' | 'levels' | 'challenges';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GamificationScreen() {
  const c = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [progress, setProgress] = useState<Progress | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('leaderboard');

  useEffect(() => {
    Promise.all([
      gamificationApi.progress().then(({ data }) => setProgress(data)),
      gamificationApi.leaderboard().then(({ data }) => setLeaderboard(data)),
      gamificationApi.challenges().then(({ data }) => setChallenges(data)),
    ]).finally(() => setLoading(false));
  }, []);

  // XP progress to next level
  const currentLevelXp = progress ? LEVEL_THRESHOLDS[progress.level - 1] ?? 0 : 0;
  const nextLevelXp = progress ? (LEVEL_THRESHOLDS[progress.level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]) : 0;
  const xpInLevel = progress ? progress.xp - currentLevelXp : 0;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const levelProgress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1;

  const isMaxLevel = progress ? progress.level >= LEVEL_THRESHOLDS.length : false;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BackIcon color={c.text1} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TrophyIcon color={c.accent} size={20} />
          <Text style={[Typography.bodyStrong, { color: c.text1 }]}>Достижения</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* XP Card */}
          {progress && (
            <View style={[styles.xpCard, { backgroundColor: c.text1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={[Typography.capUp, { color: c.accent, letterSpacing: 1 }]}>
                    Уровень {progress.level}
                  </Text>
                  <Text style={[Typography.h2, { color: c.bg, marginTop: 4 }]}>
                    {progress.level_name}
                  </Text>
                </View>
                <View style={styles.xpBadge}>
                  <ZapIcon color={c.accent} size={13} />
                  <Text style={[Typography.bodyStrong, { color: c.accent, marginLeft: 4 }]}>
                    {progress.xp} XP
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={{ marginTop: 18 }}>
                <View style={[styles.progressTrack, { backgroundColor: `${c.bg}30` }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${levelProgress * 100}%`, backgroundColor: c.accent },
                    ]}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={[Typography.micro, { color: `${c.bg}80` }]}>
                    {currentLevelXp} XP
                  </Text>
                  <Text style={[Typography.micro, { color: `${c.bg}80` }]}>
                    {isMaxLevel ? 'Макс. уровень' : `до ${nextLevelXp} XP`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Stats */}
          {progress && (
            <View style={[styles.statsRow, { paddingHorizontal: Spacing.screen }]}>
              <StatPill label="Маршрутов" value={progress.routes_completed} accent={c.accent} />
              <StatPill label="Мест" value={progress.places_discovered} accent="#3A82C2" />
              <StatPill label="км" value={Math.round(progress.distance_walked_km)} accent="#9B59B6" />
              <StatPill label="Серия дней" value={`${progress.current_streak}🔥`} accent="#D9803A" />
            </View>
          )}

          {/* Tabs */}
          <View style={[styles.tabRow, { borderBottomColor: c.border, marginTop: 8 }]}>
            {([
              { key: 'leaderboard', label: 'Рейтинг' },
              { key: 'levels',      label: 'Уровни' },
              { key: 'challenges',  label: 'Задания' },
            ] as { key: Tab; label: string }[]).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && { borderBottomWidth: 2, borderBottomColor: c.accent }]}
              >
                <Text style={[Typography.bodyStrong, { color: tab === key ? c.text1 : c.text3 }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Leaderboard ── */}
          {tab === 'leaderboard' && (
            <View style={{ paddingTop: 8, paddingBottom: 32 }}>
              {leaderboard.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <TrophyIcon color={c.text3} size={48} />
                  <Text style={[Typography.body, { color: c.text3, marginTop: 12, textAlign: 'center' }]}>
                    Рейтинг пока пуст.{'\n'}Пройди маршрут и займи первое место!
                  </Text>
                </View>
              ) : (
                leaderboard.map((entry) => {
                  const isMe = entry.nickname === user?.nickname;
                  const medal =
                    entry.rank === 1 ? '🥇' :
                    entry.rank === 2 ? '🥈' :
                    entry.rank === 3 ? '🥉' : null;

                  return (
                    <TouchableOpacity
                      key={entry.user_id}
                      style={[
                        styles.leaderRow,
                        { backgroundColor: isMe ? c.accent + '15' : c.surface, borderColor: isMe ? c.accent + '40' : 'transparent' },
                      ]}
                      onPress={() => router.push(`/user/${entry.user_id}`)}
                      activeOpacity={0.8}
                    >
                      {/* Rank */}
                      <View style={styles.rankBox}>
                        {medal ? (
                          <Text style={{ fontSize: 20 }}>{medal}</Text>
                        ) : (
                          <Text style={[Typography.bodyStrong, { color: c.text3, minWidth: 28, textAlign: 'center' }]}>
                            {entry.rank}
                          </Text>
                        )}
                      </View>

                      <Avatar
                        size={40}
                        name={entry.nickname}
                        uri={proxyUrl(entry.avatar_url)}
                      />

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[Typography.bodyStrong, { color: isMe ? c.accent : c.text1 }]} numberOfLines={1}>
                          {entry.nickname}{isMe ? ' (вы)' : ''}
                        </Text>
                        <Text style={[Typography.micro, { color: c.text3, marginTop: 1 }]}>
                          Ур. {entry.level} · {getLevelName(entry.level)}
                        </Text>
                      </View>

                      <View style={styles.xpChip}>
                        <ZapIcon color={c.accent} size={12} />
                        <Text style={[Typography.cap, { color: c.accent, marginLeft: 3 }]}>
                          {entry.xp}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* ── Levels ── */}
          {tab === 'levels' && (
            <View style={{ padding: Spacing.screen, gap: 8, paddingBottom: 32 }}>
              {LEVEL_THRESHOLDS.map((threshold, i) => {
                const lvl = i + 1;
                const name = getLevelName(lvl);
                const reached = progress ? progress.level > lvl : false;
                const isCurrent = progress ? progress.level === lvl : false;
                const nextThreshold = LEVEL_THRESHOLDS[i + 1];

                return (
                  <View
                    key={lvl}
                    style={[
                      styles.levelRow,
                      {
                        backgroundColor: isCurrent ? c.accent + '18' : c.surface,
                        borderColor: isCurrent ? c.accent : reached ? c.accent + '30' : 'transparent',
                        borderWidth: isCurrent || reached ? 1 : 0,
                        opacity: !reached && !isCurrent ? 0.55 : 1,
                      },
                    ]}
                  >
                    {/* Level badge */}
                    <View
                      style={[
                        styles.levelBadge,
                        {
                          backgroundColor: reached ? c.accent : isCurrent ? c.accent + '30' : c.surface2,
                        },
                      ]}
                    >
                      {reached ? (
                        <CheckCircle color={c.accent} />
                      ) : isCurrent ? (
                        <Text style={[Typography.bodyStrong, { color: c.accent }]}>{lvl}</Text>
                      ) : (
                        <LockIcon color={c.text3} />
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[Typography.bodyStrong, { color: isCurrent ? c.accent : c.text1 }]}>
                          Уровень {lvl}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.currentBadge, { backgroundColor: c.accent }]}>
                            <Text style={[Typography.micro, { color: '#fff' }]}>сейчас</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[Typography.cap, { color: c.text2, marginTop: 2 }]}>{name}</Text>

                      {/* XP bar for current level */}
                      {isCurrent && nextThreshold && (
                        <View style={{ marginTop: 8 }}>
                          <View style={[styles.progressTrack, { backgroundColor: c.surface2 }]}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${levelProgress * 100}%`, backgroundColor: c.accent },
                              ]}
                            />
                          </View>
                          <Text style={[Typography.micro, { color: c.text3, marginTop: 4 }]}>
                            {progress?.xp ?? 0} / {nextThreshold} XP
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={styles.xpChip}>
                        <ZapIcon color={reached || isCurrent ? c.accent : c.text3} size={11} />
                        <Text style={[Typography.micro, { color: reached || isCurrent ? c.accent : c.text3, marginLeft: 2 }]}>
                          {threshold}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Challenges ── */}
          {tab === 'challenges' && (
            <View style={{ padding: Spacing.screen, gap: 10, paddingBottom: 32 }}>
              <View style={[styles.challengeHint, { backgroundColor: c.surface2 }]}>
                <ZapIcon color={c.accent} size={14} />
                <Text style={[Typography.cap, { color: c.text2, flex: 1, marginLeft: 8 }]}>
                  Выполняй задания чтобы зарабатывать XP и повышать уровень
                </Text>
              </View>
              {challenges.map((ch) => {
                const icon = CHALLENGE_ICONS[ch.id] ?? '🎯';
                return (
                  <View
                    key={ch.id}
                    style={[styles.challengeCard, { backgroundColor: c.surface }]}
                  >
                    <View style={[styles.challengeIcon, { backgroundColor: c.surface2 }]}>
                      <Text style={{ fontSize: 24 }}>{icon}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[Typography.bodyStrong, { color: c.text1 }]}>{ch.title}</Text>
                      <Text style={[Typography.cap, { color: c.text2, marginTop: 3, lineHeight: 18 }]}>
                        {ch.description}
                      </Text>
                    </View>
                    <View style={[styles.xpReward, { backgroundColor: c.accent + '18' }]}>
                      <ZapIcon color={c.accent} size={12} />
                      <Text style={[Typography.cap, { color: c.accent, marginLeft: 3 }]}>
                        +{ch.xp_reward}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* XP sources info */}
              <Text style={[Typography.capUp, { color: c.text3, marginTop: 16, marginBottom: 4 }]}>
                Как зарабатывать XP
              </Text>
              {[
                { action: 'Завершить маршрут', xp: 100 },
                { action: 'Новое место открыто', xp: 30 },
                { action: 'Кооперативный маршрут', xp: 40 },
                { action: 'Серия 5 дней', xp: 20 },
                { action: 'Опубликовать пост', xp: 15 },
                { action: 'Первое посещение категории', xp: 50 },
              ].map(({ action, xp }) => (
                <View
                  key={action}
                  style={[styles.xpSourceRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}
                >
                  <Text style={[Typography.body, { color: c.text1, flex: 1 }]}>{action}</Text>
                  <View style={styles.xpChip}>
                    <ZapIcon color={c.accent} size={12} />
                    <Text style={[Typography.cap, { color: c.accent, marginLeft: 3 }]}>+{xp}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // XP Card
  xpCard: {
    margin: Spacing.screen, borderRadius: Radius.card, padding: 20,
  },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },

  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.screen, borderBottomWidth: 1 },
  tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 20 },

  // Leaderboard
  leaderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.screen, marginTop: 8,
    padding: 12, borderRadius: Radius.card,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  rankBox: { width: 36, alignItems: 'center', justifyContent: 'center' },
  xpChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },

  // Levels
  levelRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 14, borderRadius: Radius.card,
  },
  levelBadge: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  currentBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.pill },

  // Challenges
  challengeHint: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.md,
  },
  challengeCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.card,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  challengeIcon: { width: 52, height: 52, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  xpReward: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, marginLeft: 10,
  },
  xpSourceRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
