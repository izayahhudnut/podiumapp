import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

export type LiveCommentItem = {
  id: string;
  user: string;
  userAvatar: string;
  message: string;
  isJoined?: boolean;
};

type LiveCommentProps = {
  message: LiveCommentItem;
};

export function LiveComment({ message }: LiveCommentProps) {
  if (message.isJoined) {
    return (
      <View style={styles.joinRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{message.userAvatar}</Text>
        </View>
        <Text style={styles.joinText}>
          <Text style={styles.joinUser}>{message.user}</Text> joined
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{message.userAvatar}</Text>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.messageText}>
          <Text style={styles.user}>{message.user}</Text> {message.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.avatar,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: 260,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.overlayStrong,
  },
  messageText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '300',
  },
  user: {
    fontWeight: '600',
  },
  joinText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '300',
  },
  joinUser: {
    fontWeight: '600',
  },
});
