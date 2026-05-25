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

import { colors, radii, spacing } from '../theme';

type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
  emoji: string;
  bgColor: string;
};

const CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    name: 'Politics Arena',
    lastMessage: 'That debate was insane 🔥',
    time: '2m',
    unread: 3,
    emoji: '🏛️',
    bgColor: '#1A1A3A',
  },
  {
    id: '2',
    name: 'Tech Talk',
    lastMessage: 'AI is changing everything',
    time: '15m',
    emoji: '💻',
    bgColor: '#0A1A2A',
  },
  {
    id: '3',
    name: 'Sports Central',
    lastMessage: 'LeBron vs MJ debate tonight!',
    time: '1h',
    unread: 12,
    emoji: '⚽',
    bgColor: '#0A1A0A',
  },
  {
    id: '4',
    name: 'Hip-Hop Heads',
    lastMessage: 'Drake took the L fr',
    time: '3h',
    emoji: '🎤',
    bgColor: '#1A0A0A',
  },
  {
    id: '5',
    name: 'Gaming Zone',
    lastMessage: 'GTA VI hype is real',
    time: '5h',
    unread: 1,
    emoji: '🎮',
    bgColor: '#1A0A1A',
  },
  {
    id: '6',
    name: 'Finance Talk',
    lastMessage: 'Crypto is pumping again',
    time: '8h',
    emoji: '📈',
    bgColor: '#0A1A0A',
  },
  {
    id: '7',
    name: 'Culture Vibes',
    lastMessage: 'This debate was wild',
    time: '1d',
    emoji: '🌍',
    bgColor: '#1A0A0A',
  },
  {
    id: '8',
    name: 'Relationships',
    lastMessage: 'Y\'all buggin fr',
    time: '2d',
    emoji: '💕',
    bgColor: '#1A0A1A',
  },
];

type ChatScreenProps = {
  onRequireAuth?: () => void;
};

export function ChatScreen({ onRequireAuth }: ChatScreenProps) {
  const [query, setQuery] = useState('');

  const filtered = CONVERSATIONS.filter(
    (c) =>
      !query.trim() ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Pressable style={styles.editBtn}>
          <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations..."
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

      {/* Conversation list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filtered.map((conv) => (
          <ConversationRow key={conv.id} conversation={conv} />
        ))}
      </ScrollView>
    </View>
  );
}

function ConversationRow({ conversation: c }: { conversation: Conversation }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {/* Icon */}
      <View style={[styles.convIcon, { backgroundColor: c.bgColor }]}>
        <Text style={styles.convEmoji}>{c.emoji}</Text>
      </View>

      {/* Text */}
      <View style={styles.convInfo}>
        <Text style={styles.convName}>{c.name}</Text>
        <Text style={styles.convPreview} numberOfLines={1}>{c.lastMessage}</Text>
      </View>

      {/* Right side */}
      <View style={styles.convRight}>
        <Text style={styles.convTime}>{c.time}</Text>
        {c.unread ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{c.unread}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
    paddingVertical: 13,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '400',
    padding: 0,
  },
  listContent: {
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  convIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  convEmoji: {
    fontSize: 24,
  },
  convInfo: {
    flex: 1,
    gap: 4,
  },
  convName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  convPreview: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '400',
  },
  convRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  convTime: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  pressed: {
    backgroundColor: colors.surface,
  },
});
