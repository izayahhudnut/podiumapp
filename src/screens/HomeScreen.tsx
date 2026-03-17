import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DebateCard } from '../components/DebateCard';
import { DebateCardItem } from '../data/mockDebates';
import { colors, radii, spacing } from '../theme';

type HomeScreenProps = {
  debates: DebateCardItem[];
  errorMessage?: string | null;
  loading?: boolean;
  currentUserId?: string;
  onOpenDebate: (debateId: string) => void;
  onStartScheduled?: (debateId: string) => void;
};

type Tab = 'live' | 'upcoming';

export function HomeScreen({
  debates,
  errorMessage,
  loading = false,
  currentUserId,
  onOpenDebate,
  onStartScheduled,
}: HomeScreenProps) {
  const [tab, setTab] = useState<Tab>('live');

  const visibleDebates = debates.filter((debate) =>
    tab === 'live' ? debate.isLive : !debate.isLive,
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Podium</Text>
        <Text style={styles.subtitle}>Live debates, real conversations</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable style={styles.tabButton} onPress={() => setTab('live')}>
          <Text style={[styles.tabText, tab === 'live' && styles.tabTextActive]}>Live</Text>
          {tab === 'live' && <View style={styles.tabUnderline} />}
        </Pressable>

        <Pressable style={styles.tabButton} onPress={() => setTab('upcoming')}>
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
          {tab === 'upcoming' && <View style={styles.tabUnderline} />}
        </Pressable>
      </View>

      <View style={styles.list}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {loading && visibleDebates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {tab === 'live' ? 'Loading live debates...' : 'Loading upcoming debates...'}
            </Text>
          </View>
        ) : null}

        {!loading && visibleDebates.length === 0 ? (
          <View style={styles.emptyState}>
            {tab === 'live' ? (
              <Image
                source={require('../../mic.png')}
                style={styles.emptyImage}
                resizeMode="contain"
              />
            ) : null}
            <Text style={styles.emptyText}>
              {tab === 'live' ? 'No live debates right now' : 'No upcoming debates right now'}
            </Text>
          </View>
        ) : null}

        {visibleDebates.map((debate) => {
          const isMyScheduled =
            !debate.isLive &&
            debate.hostId === currentUserId &&
            onStartScheduled != null;

          return (
            <View key={debate.id}>
              <DebateCard
                debate={debate}
                onPress={() => onOpenDebate(debate.id)}
              />
              {isMyScheduled ? (
                <Pressable
                  style={({ pressed }) => [styles.startNowButton, pressed && styles.pressed]}
                  onPress={() => onStartScheduled(debate.id)}
                >
                  <Ionicons name="radio" size={16} color={colors.background} />
                  <Text style={styles.startNowText}>Start Now</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: -1.2,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '400',
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  tabButton: {
    position: 'relative',
    paddingBottom: spacing.md,
  },
  tabText: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '400',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  tabUnderline: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 1,
    backgroundColor: colors.textPrimary,
  },
  list: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: spacing.lg,
  },
  emptyImage: {
    width: 80,
    height: 80,
    opacity: 0.5,
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: '400',
  },
  errorText: {
    color: '#FF7A7A',
    fontSize: 13,
    fontWeight: '400',
  },
  startNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: '#F2387A',
  },
  startNowText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
