import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DebateCard } from '../components/DebateCard';
import type { DebateCardItem } from '../data/mockDebates';
import { getPublicDebatesByUser } from '../lib/debates';
import type { DebateRecord } from '../lib/debates';
import { getPublicProfile, getFollowerCount, getFollowingCount } from '../lib/profile';
import type { ProfileRecord } from '../lib/profile';
import { colors, radii, spacing } from '../theme';

type Props = {
  visible: boolean;
  userId: string;
  userName: string;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onClose: () => void;
  onOpenDebate: (debateId: string) => void;
};

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'PD'
  );
}

function mapToCard(debate: DebateRecord, hostName: string, hostAvatar: string): DebateCardItem {
  return {
    id: debate.id,
    title: debate.title,
    host: hostName,
    hostAvatar,
    hostId: debate.host_user_id,
    isLive: debate.status === 'live',
    viewers: '0',
    topic: debate.topic,
    isPublic: debate.is_public,
    image: debate.thumbnail_url ?? undefined,
  };
}

export function UserProfileModal({
  visible,
  userId,
  userName,
  isFollowing,
  onToggleFollow,
  onClose,
  onOpenDebate,
}: Props) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [debates, setDebates] = useState<DebateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true);

    Promise.all([
      getPublicProfile(userId),
      getFollowerCount(userId),
      getFollowingCount(userId),
      getPublicDebatesByUser(userId),
    ])
      .then(([prof, followers, following, userDebates]) => {
        if (!active) return;
        setProfile(prof);
        setFollowerCount(followers);
        setFollowingCount(following);
        setDebates(userDebates);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [visible, userId]);

  const initials = getInitials(userName);
  const displayUsername = profile?.username ?? userName.split(' ')[0]?.toLowerCase() ?? 'user';
  const debateCards = debates.map((d) => mapToCard(d, userName, initials));

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Profile</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.textDim} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {/* Avatar + stats */}
              <View style={styles.topRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{debates.length}</Text>
                    <Text style={styles.statLabel}>Debates</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{followerCount}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{followingCount}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                  </View>
                </View>
              </View>

              {/* Bio */}
              <View style={styles.bioBlock}>
                <Text style={styles.name}>{userName}</Text>
                <Text style={styles.username}>@{displayUsername}</Text>
                {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              </View>

              {/* Follow button */}
              <Pressable
                style={({ pressed }) => [
                  styles.followButton,
                  isFollowing && styles.followingButton,
                  pressed && styles.pressed,
                ]}
                onPress={onToggleFollow}
              >
                <Text style={[styles.followText, isFollowing && styles.followingText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </Pressable>

              {/* Debates */}
              {debateCards.length > 0 ? (
                <View style={styles.debatesList}>
                  <Text style={styles.sectionTitle}>Debates</Text>
                  {debateCards.map((debate) => (
                    <DebateCard
                      key={debate.id}
                      debate={debate}
                      onPress={() => {
                        onClose();
                        onOpenDebate(debate.id);
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderCurve: 'continuous',
    backgroundColor: '#111114',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 48,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '400',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C35F8',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '300',
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '300',
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 12,
  },
  bioBlock: {
    gap: spacing.xs,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '400',
  },
  username: {
    color: colors.textDim,
    fontSize: 13,
  },
  bio: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '300',
    marginTop: spacing.xs,
  },
  followButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.textPrimary,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  followText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '500',
  },
  followingText: {
    color: colors.textPrimary,
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '400',
    marginBottom: spacing.sm,
  },
  debatesList: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});
