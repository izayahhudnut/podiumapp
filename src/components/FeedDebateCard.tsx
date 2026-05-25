import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DebateCardItem } from '../data/mockDebates';
import { colors, categoryColors, categoryEmojis, radii, spacing } from '../theme';

export type FeedDebateCardData = DebateCardItem & {
  debaterCount?: number;
  debaterAvatars?: string[];
  tags?: string[];
  reactions?: { fire: number; mind: number; clap: number; thumbsDown: number };
  trending?: boolean;
  commentCount?: number;
  heatLevel?: number; // 0-1
};

type FeedDebateCardProps = {
  debate: FeedDebateCardData;
  onPress: () => void;
};

function getCategoryColor(category: string): string {
  return categoryColors[category] ?? colors.primary;
}

function getCategoryEmoji(category: string): string {
  return categoryEmojis[category] ?? '💬';
}

function formatViewers(viewers: string | number): string {
  const n = typeof viewers === 'string' ? parseInt(viewers.replace(/,/g, ''), 10) : viewers;
  if (isNaN(n)) return viewers.toString();
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return n.toString();
}

export function FeedDebateCard({ debate, onPress }: FeedDebateCardProps) {
  const catColor = getCategoryColor(debate.topic ?? '');
  const catEmoji = getCategoryEmoji(debate.topic ?? '');
  const heatLevel = debate.heatLevel ?? 0.7;
  const debaters = debate.debaterAvatars ?? [debate.hostAvatar?.charAt(0) ?? 'A', 'B', 'C'];
  const debaterCount = debate.debaterCount ?? debaters.length;
  const tags = debate.tags ?? [];
  const reactions = debate.reactions ?? { fire: 0, mind: 0, clap: 0, thumbsDown: 0 };
  const commentCount = debate.commentCount ?? 0;
  const trending = debate.trending ?? false;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      {/* Thumbnail section */}
      <View style={styles.thumbnail}>
        {/* Dark gradient background */}
        <View style={styles.thumbnailBg} />

        {/* Subtle gradient glow */}
        <View style={styles.thumbnailGlow} />

        {/* Top row: LIVE + category + viewer count */}
        <View style={styles.thumbTop}>
          <View style={styles.thumbBadges}>
            {debate.isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            )}
            {debate.topic ? (
              <View style={[styles.catBadge, { backgroundColor: catColor }]}>
                <Text style={styles.catBadgeText}>{catEmoji} {debate.topic}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.viewerBadge}>
            <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.viewerText}>{formatViewers(debate.viewers)}</Text>
          </View>
        </View>

        {/* Bottom row: host avatar + heat bar */}
        <View style={styles.thumbBottom}>
          <View style={styles.hostRow}>
            <View style={[styles.hostAvatar, { backgroundColor: catColor + '33' }]}>
              <Text style={styles.hostAvatarText}>
                {debate.hostAvatar?.charAt(0)?.toUpperCase() ?? 'H'}
              </Text>
            </View>
            <Text style={styles.hostName}>{debate.host}</Text>
          </View>
          <View style={styles.heatRow}>
            <Ionicons name="flame" size={14} color={colors.orange} />
            <View style={styles.heatBar}>
              <View style={[styles.heatFill, { width: `${heatLevel * 100}%` }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Card body */}
      <View style={styles.body}>
        {/* Title */}
        <Text style={[styles.title, trending && styles.titleTrending]} numberOfLines={2}>
          {debate.title}
        </Text>

        {/* Debaters + trending + comments */}
        <View style={styles.metaRow}>
          <View style={styles.debatersRow}>
            {debaters.slice(0, 3).map((avatar, i) => (
              <View
                key={i}
                style={[
                  styles.debaterAvatar,
                  { marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i },
                ]}
              >
                <Text style={styles.debaterAvatarText}>{avatar.charAt(0).toUpperCase()}</Text>
              </View>
            ))}
            {debaterCount > 3 && (
              <View style={[styles.debaterAvatar, styles.debaterExtra, { marginLeft: -8 }]}>
                <Text style={styles.debaterExtraText}>+{debaterCount - 3}</Text>
              </View>
            )}
            <Text style={styles.debaterCount}>{debaterCount} debaters</Text>
          </View>

          <View style={styles.rightMeta}>
            {trending && (
              <View style={styles.trendingBadge}>
                <Ionicons name="trending-up" size={11} color={colors.orange} />
                <Text style={styles.trendingText}>Trending</Text>
              </View>
            )}
            {commentCount > 0 && (
              <View style={styles.commentRow}>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />
                <Text style={styles.commentCount}>{commentCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Hashtags */}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.slice(0, 4).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reactions */}
        {(reactions.fire > 0 || reactions.mind > 0 || reactions.clap > 0 || reactions.thumbsDown > 0) && (
          <View style={styles.reactionsRow}>
            {reactions.fire > 0 && (
              <Text style={styles.reaction}>🔥 {reactions.fire}</Text>
            )}
            {reactions.mind > 0 && (
              <Text style={styles.reaction}>🤯 {reactions.mind}</Text>
            )}
            {reactions.clap > 0 && (
              <Text style={styles.reaction}>👏 {reactions.clap}</Text>
            )}
            {reactions.thumbsDown > 0 && (
              <Text style={styles.reaction}>👎 {reactions.thumbsDown}</Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },

  // Thumbnail
  thumbnail: {
    height: 200,
    position: 'relative',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  thumbnailBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A0A2E',
  },
  thumbnailGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Simulated radial glow via border radius trick
  },
  thumbTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  thumbBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  catBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  viewerText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  thumbBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124,58,237,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  hostAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  hostName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  heatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heatBar: {
    width: 80,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  heatFill: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 2,
  },

  // Body
  body: {
    padding: spacing.md,
    gap: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  titleTrending: {
    color: colors.primaryLight,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debatersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debaterAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  debaterAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  debaterExtra: {
    backgroundColor: colors.surface,
  },
  debaterExtraText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  debaterCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  rightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendingText: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  commentCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  reaction: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
