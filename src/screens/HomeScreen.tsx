import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { FeedDebateCard, type FeedDebateCardData } from '../components/FeedDebateCard';
import type { DebateCardItem } from '../data/mockDebates';
import { colors, categoryColors, categoryEmojis, radii, spacing } from '../theme';

// Trending now topics
const TRENDING_TOPICS = [
  { emoji: '🤖', label: 'AI vs Jobs', hot: true },
  { emoji: '🏀', label: 'NBA Finals' },
  { emoji: '₿', label: 'Crypto Crash' },
  { emoji: '🗳️', label: 'Election 2026' },
  { emoji: '🎤', label: 'Rap Beef' },
];

// Categories
const CATEGORIES = [
  { id: 'foryou', label: 'For You', emoji: '✨', gradient: true },
  { id: 'politics', label: 'Politics', emoji: '🏛️' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'hiphop', label: 'Hip-Hop', emoji: '🎤' },
  { id: 'tech', label: 'Tech', emoji: '💻' },
  { id: 'relationships', label: 'Relationships', emoji: '💕' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'culture', label: 'Culture', emoji: '🌍' },
  { id: 'finance', label: 'Finance', emoji: '📈' },
];

// Mock data to enrich debate cards with feed-specific fields
function enrichDebate(d: DebateCardItem, index: number): FeedDebateCardData {
  const mockData: Partial<FeedDebateCardData>[] = [
    {
      debaterCount: 4,
      debaterAvatars: ['A', 'B', 'C', 'D'],
      tags: ['AI', 'jobs', 'future'],
      reactions: { fire: 342, mind: 128, clap: 89, thumbsDown: 201 },
      trending: true,
      commentCount: 91,
      heatLevel: 0.82,
    },
    {
      debaterCount: 3,
      debaterAvatars: ['A', 'B', 'C'],
      tags: ['NBA', 'LeBron', 'Jordan'],
      reactions: { fire: 567, mind: 43, clap: 312, thumbsDown: 445 },
      trending: true,
      commentCount: 268,
      heatLevel: 0.75,
    },
    {
      debaterCount: 5,
      debaterAvatars: ['A', 'B', 'C', 'D', 'E'],
      tags: ['Drake', 'Kendrick', 'beef'],
      reactions: { fire: 890, mind: 234, clap: 156, thumbsDown: 678 },
      trending: true,
      commentCount: 98,
      heatLevel: 0.95,
    },
    {
      debaterCount: 4,
      debaterAvatars: ['A', 'B', 'C', 'D'],
      tags: ['dating', 'tinder', 'love'],
      reactions: { fire: 0, mind: 0, clap: 0, thumbsDown: 0 },
      trending: false,
      commentCount: 326,
      heatLevel: 0.6,
    },
    {
      debaterCount: 6,
      debaterAvatars: ['A', 'B', 'C', 'D', 'E', 'F'],
      tags: ['democracy', 'politics', 'elections'],
      reactions: { fire: 423, mind: 312, clap: 189, thumbsDown: 534 },
      trending: true,
      commentCount: 220,
      heatLevel: 0.88,
    },
  ];

  return {
    ...d,
    ...(mockData[index % mockData.length] ?? {}),
  };
}

type HomeScreenProps = {
  debates: DebateCardItem[];
  errorMessage?: string | null;
  loading?: boolean;
  currentUserId?: string;
  onOpenDebate: (debateId: string) => void;
  onStartScheduled?: (debateId: string) => void;
  onViewProfile?: (userId: string, userName: string) => void;
};

export function HomeScreen({
  debates,
  errorMessage,
  loading = false,
  currentUserId,
  onOpenDebate,
  onStartScheduled,
}: HomeScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState('foryou');

  const liveDebates = debates.filter((d) => d.isLive);
  const feedDebates = debates.map((d, i) => enrichDebate(d, i));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={['#7C3AED', '#FF1F6A']}
            style={styles.logoBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.logoText}>Podium</Text>
          <View style={styles.livePill}>
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
        </View>
        <Pressable style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      {/* Trending Now */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.fireCircle}>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>
          <Text style={styles.sectionTitle}>TRENDING NOW</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingRow}
        >
          {TRENDING_TOPICS.map((topic) => (
            <Pressable
              key={topic.label}
              style={({ pressed }) => [styles.trendingChip, pressed && styles.pressed]}
            >
              <Text style={styles.trendingChipText}>
                {topic.emoji} {topic.label}{topic.hot ? ' ⚡' : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Live Now */}
      <View style={styles.section}>
        <View style={styles.liveNowHeader}>
          <View style={styles.liveNowLeft}>
            <View style={styles.liveNowBadge}>
              <View style={styles.liveNowDot} />
              <Text style={styles.liveNowBadgeText}>LIVE</Text>
            </View>
            <Text style={styles.sectionTitle}>LIVE NOW</Text>
          </View>
          <Text style={styles.activeCount}>{liveDebates.length || 6} active</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.liveNowRow}
        >
          {(liveDebates.length > 0 ? liveDebates : MOCK_LIVE_PREVIEWS).map((d, i) => (
            <LivePreviewCard
              key={d.id ?? i}
              title={typeof d === 'string' ? d : (d as DebateCardItem).title}
              viewers={typeof d === 'string' ? '0' : (d as DebateCardItem).viewers}
              host={typeof d === 'string' ? 'Host' : (d as DebateCardItem).host}
              onPress={() => {
                if (typeof d !== 'string') onOpenDebate((d as DebateCardItem).id);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [
                styles.catPill,
                !isActive && styles.catPillInactive,
                pressed && styles.pressed,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#7C3AED', '#FF1F6A']}
                  style={styles.catPillGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.catPillText}>{cat.emoji} {cat.label}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.catPillTextInactive}>{cat.emoji} {cat.label}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Feed */}
      <View style={styles.feed}>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {feedDebates.length > 0 ? (
          feedDebates.map((d, i) => (
            <FeedDebateCard
              key={d.id}
              debate={d}
              onPress={() => onOpenDebate(d.id)}
            />
          ))
        ) : !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="mic-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyText}>No debates right now</Text>
            <Text style={styles.emptySubText}>Be the first to start one</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

type LivePreviewCardProps = {
  title: string;
  viewers: string;
  host: string;
  onPress: () => void;
};

function LivePreviewCard({ title, viewers, host, onPress }: LivePreviewCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.livePreviewCard, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.livePreviewBg}>
        <View style={styles.livePreviewGlow} />
      </View>
      <View style={styles.livePreviewHostRow}>
        <View style={styles.livePreviewAvatar}>
          <Text style={styles.livePreviewAvatarText}>{host.charAt(0).toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.livePreviewTitle} numberOfLines={2}>{title}</Text>
      <Text style={styles.livePreviewViewers}>{viewers} watching</Text>
    </Pressable>
  );
}

// Mock previews when no live debates
const MOCK_LIVE_PREVIEWS = [
  { id: 'm1', title: 'Is AI Going to Replace 90% of...', viewers: '12400', host: 'TechVision', isLive: true, hostAvatar: 'T', topic: 'Tech', isPublic: true },
  { id: 'm2', title: 'LeBron vs Jordan: The REAL GOAT...', viewers: '8700', host: 'SportsKing', isLive: true, hostAvatar: 'S', topic: 'Sports', isPublic: true },
  { id: 'm3', title: 'Drake vs Kendrick: Who Won the Beef', viewers: '15200', host: 'BarsTalk', isLive: true, hostAvatar: 'B', topic: 'Hip-Hop', isPublic: true },
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  livePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: colors.background,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  fireCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireEmoji: {
    fontSize: 14,
  },

  // Trending
  trendingRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  trendingChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  trendingChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Live Now
  liveNowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  liveNowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  liveNowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveNowBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  liveNowRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    flexDirection: 'row',
  },
  livePreviewCard: {
    width: 160,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  livePreviewBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A0A2E',
  },
  livePreviewGlow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  livePreviewHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 60,
  },
  livePreviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePreviewAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  livePreviewTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  livePreviewViewers: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },

  // Categories
  categoriesRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  catPill: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  catPillInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  catPillGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  catPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  catPillTextInactive: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  // Feed
  feed: {
    paddingHorizontal: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    color: colors.textFaint,
    fontSize: 13,
  },
  errorText: {
    color: '#FF7A7A',
    fontSize: 13,
    paddingBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
});
