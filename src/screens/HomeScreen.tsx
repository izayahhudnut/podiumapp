import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.trim().toLowerCase();

  const visibleDebates = debates
    .filter((debate) => (tab === 'live' ? debate.isLive : !debate.isLive))
    .filter((debate) => {
      if (!q) return true;
      return (
        debate.title.toLowerCase().includes(q) ||
        (debate.topic ?? '').toLowerCase().includes(q) ||
        debate.host.toLowerCase().includes(q)
      );
    });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Podium</Text>
        <Text style={styles.subtitle}>Live debates, real conversations</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textDim} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search debates, topics, hosts..."
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textDim} />
            </Pressable>
          ) : null}
        </View>
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
            <ActivityIndicator color={colors.textDim} size="small" />
            <Text style={styles.emptyText}>
              {tab === 'live' ? 'Loading live debates...' : 'Loading upcoming debates...'}
            </Text>
          </View>
        ) : null}

        {!loading && visibleDebates.length === 0 ? (
          <View style={styles.emptyState}>
            {q ? (
              <>
                <Ionicons name="search-outline" size={36} color={colors.textFaint} />
                <Text style={styles.emptyText}>No debates match "{searchQuery}"</Text>
              </>
            ) : tab === 'live' ? (
              <>
                <Image
                  source={require('../../mic.png')}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyText}>No live debates right now</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>No upcoming debates right now</Text>
            )}
          </View>
        ) : null}

        {visibleDebates.map((debate) => {
          const isMyScheduled =
            !debate.isLive && debate.hostId === currentUserId && onStartScheduled != null;

          return (
            <View key={debate.id}>
              <DebateCard debate={debate} onPress={() => onOpenDebate(debate.id)} />
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
    paddingBottom: spacing.lg,
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
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '400',
    padding: 0,
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
