import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FeedDebateCard, type FeedDebateCardData } from '../components/FeedDebateCard';
import type { DebateCardItem } from '../data/mockDebates';
import { colors, radii, spacing } from '../theme';

// Top Debaters mock data
const TOP_DEBATERS = [
  { id: '1', name: 'DebateKing', wins: 142, rank: 1, color: '#F97316', initial: 'D' },
  { id: '2', name: 'TruthSeeker', wins: 128, rank: 2, color: '#9CA3AF', initial: 'T' },
  { id: '3', name: 'HotTakes99', wins: 97, rank: 3, color: '#F97316', initial: 'H' },
  { id: '4', name: 'BarsTalk', wins: 89, rank: 4, color: '#7C3AED', initial: 'B' },
  { id: '5', name: 'SportsKing', wins: 76, rank: 5, color: '#22C55E', initial: 'S' },
  { id: '6', name: 'TechVision', wins: 71, rank: 6, color: '#3B82F6', initial: 'T' },
  { id: '7', name: 'WorldPol', wins: 65, rank: 7, color: '#7C3AED', initial: 'W' },
  { id: '8', name: 'LoveTalk', wins: 58, rank: 8, color: '#EC4899', initial: 'L' },
  { id: '9', name: 'CulturePls', wins: 49, rank: 9, color: '#F97316', initial: 'C' },
  { id: '10', name: 'FinanceGod', wins: 44, rank: 10, color: '#22C55E', initial: 'F' },
];

// Hot Topics mock data
const HOT_TOPICS = [
  { emoji: '🤖', label: 'AI replacing humans', debates: '12.3K', bgColor: '#1A1A2E' },
  { emoji: '🎤', label: 'Best rapper alive', debates: '8.7K', bgColor: '#1A0A1A' },
  { emoji: '🏢', label: 'Remote work vs office', debates: '6.2K', bgColor: '#0A1A1A' },
  { emoji: '₿', label: 'Crypto winter', debates: '5.1K', bgColor: '#1A1A0A' },
  { emoji: '🏛️', label: 'Is democracy failing?', debates: '4.8K', bgColor: '#0A0A1A' },
];

// Enrich debate with mock feed data
function enrichDebate(d: DebateCardItem, i: number): FeedDebateCardData {
  const mockExtras: Partial<FeedDebateCardData>[] = [
    {
      debaterCount: 5,
      debaterAvatars: ['A', 'B', 'C', 'D', 'E'],
      tags: ['Drake', 'Kendrick', 'beef'],
      reactions: { fire: 890, mind: 234, clap: 156, thumbsDown: 678 },
      trending: true,
      commentCount: 249,
      heatLevel: 0.95,
    },
    {
      debaterCount: 4,
      debaterAvatars: ['A', 'B', 'C', 'D'],
      tags: ['AI', 'jobs', 'future'],
      reactions: { fire: 342, mind: 128, clap: 89, thumbsDown: 201 },
      trending: true,
      commentCount: 109,
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
      debaterCount: 6,
      debaterAvatars: ['A', 'B', 'C', 'D', 'E', 'F'],
      tags: ['democracy', 'politics', 'elections'],
      reactions: { fire: 423, mind: 312, clap: 189, thumbsDown: 534 },
      trending: true,
      commentCount: 344,
      heatLevel: 0.88,
    },
    {
      debaterCount: 4,
      debaterAvatars: ['A', 'B', 'C', 'D'],
      tags: ['remotework', 'office', 'career'],
      reactions: { fire: 287, mind: 56, clap: 134, thumbsDown: 398 },
      trending: false,
      commentCount: 327,
      heatLevel: 0.65,
    },
  ];

  return { ...d, ...(mockExtras[i % mockExtras.length] ?? {}) };
}

type DiscoverScreenProps = {
  debates: DebateCardItem[];
  onOpenDebate: (debateId: string) => void;
};

export function DiscoverScreen({ debates, onOpenDebate }: DiscoverScreenProps) {
  const [query, setQuery] = useState('');

  const trendingDebates = debates.map((d, i) => enrichDebate(d, i));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search debates, topics, creators..."
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Top Debaters */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy-outline" size={20} color={colors.gold} />
          <Text style={styles.sectionTitle}>TOP DEBATERS</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.debatersRow}
        >
          {TOP_DEBATERS.slice(0, 3).map((debater) => (
            <View key={debater.id} style={styles.debaterCard}>
              <View style={[styles.debaterAvatar, { backgroundColor: debater.color }]}>
                <Text style={styles.debaterAvatarText}>{debater.initial}</Text>
              </View>
              <Text style={styles.debaterName}>{debater.name}</Text>
              <Text style={styles.debaterWins}>{debater.wins} wins</Text>
              <View style={styles.debaterRankRow}>
                <Ionicons name="star-outline" size={12} color={colors.gold} />
                <Text style={styles.debaterRank}>#{debater.rank}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Debaters 4-10 as a list */}
        <View style={styles.debatersList}>
          {TOP_DEBATERS.slice(3).map((debater) => (
            <View key={debater.id} style={styles.debaterRow}>
              <Text style={styles.debaterRowRank}>#{debater.rank}</Text>
              <View style={[styles.debaterRowAvatar, { backgroundColor: debater.color }]}>
                <Text style={styles.debaterRowAvatarText}>{debater.initial}</Text>
              </View>
              <Text style={styles.debaterRowName}>{debater.name}</Text>
              <Text style={styles.debaterRowWins}>{debater.wins} wins</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Hot Topics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flame-outline" size={20} color={colors.orange} />
          <Text style={styles.sectionTitle}>HOT TOPICS</Text>
        </View>
        <View style={styles.topicsList}>
          {HOT_TOPICS.map((topic) => (
            <Pressable
              key={topic.label}
              style={({ pressed }) => [styles.topicRow, pressed && styles.pressed]}
            >
              <View style={[styles.topicIcon, { backgroundColor: topic.bgColor }]}>
                <Text style={styles.topicEmoji}>{topic.emoji}</Text>
              </View>
              <View style={styles.topicInfo}>
                <Text style={styles.topicLabel}>{topic.label}</Text>
                <Text style={styles.topicDebates}>{topic.debates} debates</Text>
              </View>
              <Ionicons name="trending-up" size={18} color={colors.green} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Trending Debates */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TRENDING DEBATES</Text>
        </View>
        <View style={styles.debatesFeed}>
          {trendingDebates.map((d) => (
            <FeedDebateCard
              key={d.id}
              debate={d}
              onPress={() => onOpenDebate(d.id)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 120,
    paddingTop: 60,
  },

  // Search
  searchWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '400',
    padding: 0,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
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

  // Top Debaters grid (top 3)
  debatersRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    flexDirection: 'row',
  },
  debaterCard: {
    flex: 1,
    minWidth: 110,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  debaterAvatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  debaterAvatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  debaterName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  debaterWins: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  debaterRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  debaterRank: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },

  // Debaters list (4-10)
  debatersList: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  debaterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  debaterRowRank: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    width: 28,
  },
  debaterRowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debaterRowAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  debaterRowName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  debaterRowWins: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  // Hot Topics
  topicsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  topicIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  topicEmoji: {
    fontSize: 24,
  },
  topicInfo: {
    flex: 1,
    gap: 3,
  },
  topicLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  topicDebates: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  // Debates feed
  debatesFeed: {
    paddingHorizontal: spacing.lg,
  },

  pressed: {
    opacity: 0.85,
  },
});
