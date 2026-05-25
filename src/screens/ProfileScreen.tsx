import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { CoinSheetModal } from '../components/CoinSheetModal';
import type { DebateCardItem } from '../data/mockDebates';
import { colors, categoryColors, categoryEmojis, radii, spacing } from '../theme';

export type EditProfileValues = {
  name: string;
  username: string;
  bio: string;
  avatarUri: string | null;
};

type ProfileScreenProps = {
  userName: string;
  userEmail: string;
  userId: string;
  userAvatarUri?: string | null;
  username: string | null;
  bio: string | null;
  debateCount: number;
  debates: DebateCardItem[];
  likedDebates: DebateCardItem[];
  savedDebates: DebateCardItem[];
  savedDebateIds: Set<string>;
  editSubmitting?: boolean;
  editError?: string | null;
  onEditProfile: (values: EditProfileValues) => Promise<void>;
  onSignOut: () => void;
  onOpenDebate: (debateId: string) => void;
  onSaveDebate: (debateId: string) => void;
  onDeleteDebate: (debateId: string) => void;
  onSaveBroadcast?: (debateId: string) => void;
  followerCount: number;
  followingCount: number;
};

type Tab = 'debates' | 'clips' | 'saved';

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

function getCategoryColor(topic: string): string {
  return categoryColors[topic] ?? colors.primary;
}

function getCategoryEmoji(topic: string): string {
  return categoryEmojis[topic] ?? '💬';
}

export function ProfileScreen({
  userName,
  userEmail,
  userId,
  userAvatarUri,
  username,
  bio,
  debateCount,
  debates,
  likedDebates,
  savedDebates,
  savedDebateIds,
  editSubmitting = false,
  editError = null,
  onEditProfile,
  onSignOut,
  onOpenDebate,
  onSaveDebate,
  onDeleteDebate,
  onSaveBroadcast,
  followerCount,
  followingCount,
}: ProfileScreenProps) {
  const [tab, setTab] = useState<Tab>('debates');
  const [isEditing, setIsEditing] = useState(false);
  const [isCoinSheetOpen, setIsCoinSheetOpen] = useState(false);

  const [editName, setEditName] = useState(userName);
  const [editUsername, setEditUsername] = useState(username ?? '');
  const [editBio, setEditBio] = useState(bio ?? '');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(userAvatarUri ?? null);

  const visibleDebates =
    tab === 'debates' ? debates : tab === 'saved' ? savedDebates : [];

  const displayUsername = username || userEmail.split('@')[0];
  const initials = getInitials(userName);

  // Mock stats
  const wins = Math.floor(debateCount * 0.68);
  const score = Math.min(99, Math.floor(debateCount * 2 + wins));
  const streakDays = 7;

  function openEditModal() {
    setEditName(userName);
    setEditUsername(username ?? '');
    setEditBio(bio ?? '');
    setEditAvatarUri(userAvatarUri ?? null);
    setIsEditing(true);
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      mediaTypes: ['images'],
    });
    if (!result.canceled) setEditAvatarUri(result.assets[0]?.uri ?? null);
  }

  async function handleSaveProfile() {
    await onEditProfile({
      name: editName.trim(),
      username: editUsername.trim(),
      bio: editBio.trim(),
      avatarUri: editAvatarUri,
    });
    setIsEditing(false);
  }

  function confirmDelete(debateId: string) {
    Alert.alert('Delete Debate', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteDebate(debateId) },
    ]);
  }

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header background glow */}
        <View style={styles.headerBg}>
          <View style={styles.headerGlowLeft} />
          <View style={styles.headerGlowRight} />
        </View>

        {/* Settings button */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}
            onPress={onSignOut}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Avatar + name + edit */}
        <View style={styles.profileSection}>
          <View style={styles.avatarArea}>
            {/* Avatar with gradient border */}
            <LinearGradient
              colors={['#7C3AED', '#FF1F6A']}
              style={styles.avatarBorder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.avatarInner}>
                {userAvatarUri ? (
                  <Image source={{ uri: userAvatarUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
            </LinearGradient>

            {/* Streak badge */}
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>{streakDays}</Text>
            </View>
          </View>

          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <View style={styles.nameLeft}>
                <Text style={styles.displayName}>{userName}</Text>
                <Text style={styles.handle}>@{displayUsername}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.editProfileBtn, pressed && styles.pressed]}
                onPress={openEditModal}
              >
                <LinearGradient
                  colors={['#7C3AED', '#FF1F6A']}
                  style={styles.editProfileGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {bio ? (
              <Text style={styles.bioText}>{bio}</Text>
            ) : (
              <Text style={styles.bioText}>Debate enthusiast | Hot takes only 🔥 | Pro debater since 2024</Text>
            )}
          </View>
        </View>

        {/* Badge pills */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, styles.badgeGold]}>
            <Ionicons name="trophy-outline" size={13} color={colors.gold} />
            <Text style={[styles.badgeText, { color: colors.gold }]}>Top Debater</Text>
          </View>
          <View style={[styles.badge, styles.badgePurple]}>
            <Ionicons name="ribbon-outline" size={13} color={colors.primaryLight} />
            <Text style={[styles.badgeText, { color: colors.primaryLight }]}>Verified</Text>
          </View>
          <View style={[styles.badge, styles.badgeOrange]}>
            <Ionicons name="flame-outline" size={13} color={colors.orange} />
            <Text style={[styles.badgeText, { color: colors.orange }]}>{streakDays}-day streak</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard label="DEBATES" value={String(debateCount || 47)} delta="+5" />
          <StatCard label="WINS" value={String(wins || 32)} delta="+2" />
          <StatCard label="FOLLOWERS" value={formatBig(followerCount || 2400)} delta="+120" />
          <StatCard label="SCORE" value={String(score || 94)} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsBar}>
          {(['debates', 'clips', 'saved'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              style={({ pressed }) => [
                styles.tabBtn,
                tab === t && styles.tabBtnActive,
                pressed && styles.pressed,
              ]}
              onPress={() => setTab(t)}
            >
              {tab === t ? (
                <LinearGradient
                  colors={['#7C3AED', '#FF1F6A']}
                  style={styles.tabBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.tabTextActive}>{capitalize(t)}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>{capitalize(t)}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Debate list */}
        {visibleDebates.length > 0 ? (
          <View style={styles.debateList}>
            {visibleDebates.map((debate) => (
              <Pressable
                key={debate.id}
                style={({ pressed }) => [styles.debateRow, pressed && styles.pressed]}
                onPress={() => onOpenDebate(debate.id)}
              >
                <View style={styles.debateRowIcon}>
                  <Ionicons name="mic" size={22} color={colors.primaryLight} />
                </View>
                <View style={styles.debateRowInfo}>
                  <Text style={styles.debateRowTitle} numberOfLines={1}>
                    {debate.title}
                  </Text>
                  <View style={styles.debateRowBadges}>
                    {debate.topic ? (
                      <View style={[styles.debateCatBadge, { backgroundColor: getCategoryColor(debate.topic) }]}>
                        <Text style={styles.debateBadgeText}>{getCategoryEmoji(debate.topic)} {debate.topic}</Text>
                      </View>
                    ) : null}
                    {debate.isLive && (
                      <View style={styles.debateLiveBadge}>
                        <View style={styles.debateLiveDot} />
                        <Text style={styles.debateLiveText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.debateRowRight}>
                  <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.debateRowViewers}>{debate.viewers}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="mic-outline" size={40} color={colors.textFaint} />
            <Text style={styles.emptyText}>
              {tab === 'debates'
                ? "No debates yet"
                : tab === 'clips'
                  ? "No clips yet"
                  : "Nothing saved yet"}
            </Text>
          </View>
        )}

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
          onPress={onSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <CoinSheetModal
        visible={isCoinSheetOpen}
        userId={userId}
        onClose={() => setIsCoinSheetOpen(false)}
      />

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isEditing}
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsEditing(false)} />
          <View style={styles.editSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Profile</Text>
              <Pressable
                onPress={() => setIsEditing(false)}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editForm}>
              <Pressable
                style={({ pressed }) => [styles.avatarPickerRow, pressed && styles.pressed]}
                onPress={() => { void handlePickAvatar(); }}
              >
                <View style={styles.editAvatar}>
                  {editAvatarUri ? (
                    <Image source={{ uri: editAvatarUri }} style={styles.editAvatarImage} />
                  ) : (
                    <Text style={styles.editAvatarText}>{getInitials(editName || userName)}</Text>
                  )}
                </View>
                <Text style={styles.avatarPickerLabel}>Change photo</Text>
              </Pressable>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textFaint}
                  editable={!editSubmitting}
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Username</Text>
                <TextInput
                  style={styles.editInput}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="yourhandle"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  editable={!editSubmitting}
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Bio</Text>
                <TextInput
                  style={styles.editTextarea}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell people about yourself..."
                  placeholderTextColor={colors.textFaint}
                  multiline
                  textAlignVertical="top"
                  editable={!editSubmitting}
                />
              </View>

              {editError ? <Text style={styles.errorText}>{editError}</Text> : null}

              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  editSubmitting && styles.saveButtonDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => { void handleSaveProfile(); }}
                disabled={editSubmitting}
              >
                {editSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <LinearGradient
                    colors={['#7C3AED', '#FF1F6A']}
                    style={styles.saveButtonGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </LinearGradient>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function StatCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {delta ? <Text style={styles.statDelta}>{delta}</Text> : null}
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatBig(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return String(n);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 120,
  },

  // Header bg glow
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    height: 300,
    overflow: 'hidden',
  },
  headerGlowLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  headerGlowRight: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,31,106,0.08)',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile section
  profileSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  avatarArea: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatarBorder: {
    width: 92,
    height: 92,
    borderRadius: 22,
    padding: 2.5,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#1A0A2E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  streakBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  nameBlock: {
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameLeft: {
    gap: 2,
  },
  displayName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  handle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  editProfileBtn: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  editProfileGrad: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  editProfileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bioText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  badgeGold: {
    borderColor: colors.gold,
  },
  badgePurple: {
    borderColor: colors.primaryLight,
  },
  badgeOrange: {
    borderColor: colors.orange,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  statDelta: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Tabs
  tabsBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  tabBtnActive: {},
  tabBtnGrad: {
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 9,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Debate list
  debateList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  debateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.md,
  },
  debateRowIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(124,58,237,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  debateRowInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  debateRowTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  debateRowBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  debateCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  debateBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  debateLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  debateLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  debateLiveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  debateRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  debateRowViewers: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 15,
    fontWeight: '500',
  },

  // Sign out
  signOutBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  // Edit modal
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  editSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    backgroundColor: '#111111',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
    gap: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  editForm: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  editAvatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  editAvatarImage: {
    width: '100%',
    height: '100%',
  },
  editAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  avatarPickerLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  editField: {
    gap: spacing.sm,
  },
  editLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editInput: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
  editTextarea: {
    minHeight: 90,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#FF7A7A',
    fontSize: 13,
  },
  saveButton: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGrad: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
