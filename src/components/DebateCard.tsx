import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { DebateCardItem } from '../data/mockDebates';
import { colors, radii, spacing } from '../theme';

type DebateCardProps = {
  debate: DebateCardItem;
  onPress: () => void;
  compact?: boolean;
};

export function DebateCard({ debate, onPress, compact = false }: DebateCardProps) {
  const cardHeight = compact ? 232 : 360;
  const content = (
    <>
      <View style={styles.overlay} />

      <View style={styles.topRow}>
        <View style={[styles.badge, debate.isLive ? styles.liveBadge : styles.upcomingBadge]}>
          <Text style={[styles.badgeText, !debate.isLive && styles.badgeTextMuted]}>
            {debate.isLive ? 'LIVE' : 'Upcoming'}
          </Text>
        </View>

        {debate.isLive ? (
          <View style={styles.viewerBadge}>
            <Text style={styles.viewerText}>{debate.viewers}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <View style={styles.hostRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{debate.hostAvatar}</Text>
          </View>
          <View style={styles.hostCopy}>
            <Text style={styles.host}>{debate.host}</Text>
            <Text style={styles.hostMeta}>
              {debate.isLive ? debate.startedAt : debate.scheduledFor}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={compact ? 3 : 2}>
          {debate.title}
        </Text>

        <View style={styles.meta}>
          <View style={styles.topicPill}>
            <Text style={styles.topicText}>{debate.topic}</Text>
          </View>
          {!debate.isPublic ? (
            <View style={styles.topicPill}>
              <Text style={styles.topicText}>Private</Text>
            </View>
          ) : null}
        </View>
      </View>
    </>
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed, compact && styles.compactCard]}
      onPress={onPress}
    >
      {debate.image ? (
        <ImageBackground
          source={{ uri: debate.image }}
          imageStyle={styles.image}
          style={[styles.card, { minHeight: cardHeight }]}
        >
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.card, styles.fallbackCard, { minHeight: cardHeight }]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    borderCurve: 'continuous',
  },
  compactCard: {
    flex: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  card: {
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.surfaceRaised,
  },
  fallbackCard: {
    backgroundColor: '#4A175D',
  },
  image: {
    borderRadius: radii.xl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
  },
  liveBadge: {
    backgroundColor: 'rgba(240, 43, 108, 0.95)',
  },
  upcomingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextMuted: {
    color: colors.textSecondary,
  },
  viewerBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.overlayStrong,
  },
  viewerText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  bottom: {
    gap: spacing.md,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '300',
  },
  hostCopy: {
    flex: 1,
    gap: 2,
  },
  host: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 14,
    fontWeight: '400',
  },
  hostMeta: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '400',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '300',
  },
  titleCompact: {
    fontSize: 18,
    lineHeight: 23,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  topicText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '400',
  },
});
