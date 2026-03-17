import { useState } from 'react';
import {
  ActivityIndicator,
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
import * as ImagePicker from 'expo-image-picker';

import { DebateCard } from '../components/DebateCard';
import type { DebateCardItem } from '../data/mockDebates';
import { colors, radii, spacing } from '../theme';

export type EditProfileValues = {
  name: string;
  username: string;
  bio: string;
  avatarUri: string | null;
};

type ProfileScreenProps = {
  userName: string;
  userEmail: string;
  userAvatarUri?: string | null;
  username: string | null;
  bio: string | null;
  debateCount: number;
  debates: DebateCardItem[];
  likedDebates: DebateCardItem[];
  editSubmitting?: boolean;
  editError?: string | null;
  onEditProfile: (values: EditProfileValues) => Promise<void>;
  onSignOut: () => void;
  onOpenDebate: (debateId: string) => void;
};

type Tab = 'debates' | 'liked';

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

export function ProfileScreen({
  userName,
  userEmail,
  userAvatarUri,
  username,
  bio,
  debateCount,
  debates,
  likedDebates,
  editSubmitting = false,
  editError = null,
  onEditProfile,
  onSignOut,
  onOpenDebate,
}: ProfileScreenProps) {
  const [tab, setTab] = useState<Tab>('debates');
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(userName);
  const [editUsername, setEditUsername] = useState(username ?? '');
  const [editBio, setEditBio] = useState(bio ?? '');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(userAvatarUri ?? null);

  const visibleDebates = tab === 'debates' ? debates : likedDebates;
  const displayUsername = username || userEmail.split('@')[0];
  const initials = getInitials(userName);

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

    if (!result.canceled) {
      setEditAvatarUri(result.assets[0]?.uri ?? null);
    }
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

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.topRow}>
            <Pressable onPress={openEditModal} style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {userAvatarUri ? (
                  <Image source={{ uri: userAvatarUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={12} color={colors.background} />
              </View>
            </Pressable>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{debateCount}</Text>
                <Text style={styles.statLabel}>Debates</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{likedDebates.length}</Text>
                <Text style={styles.statLabel}>Liked</Text>
              </View>
            </View>
          </View>

          <View style={styles.bioBlock}>
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.usernameText}>@{displayUsername}</Text>
            <Text style={styles.sessionEmail}>{userEmail}</Text>
            {bio ? <Text style={styles.bioText}>{bio}</Text> : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
              onPress={openEditModal}
            >
              <Text style={styles.primaryActionText}>Edit Profile</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
              onPress={onSignOut}
            >
              <Text style={styles.secondaryActionText}>Sign Out</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable style={styles.tabButton} onPress={() => setTab('debates')}>
            <Text style={[styles.tabText, tab === 'debates' && styles.tabTextActive]}>
              Debates
            </Text>
            {tab === 'debates' && <View style={styles.tabUnderline} />}
          </Pressable>

          <Pressable style={styles.tabButton} onPress={() => setTab('liked')}>
            <Text style={[styles.tabText, tab === 'liked' && styles.tabTextActive]}>Liked</Text>
            {tab === 'liked' && <View style={styles.tabUnderline} />}
          </Pressable>
        </View>

        {visibleDebates.length > 0 ? (
          <View style={styles.grid}>
            {visibleDebates.map((debate, index) => (
              <View
                key={debate.id}
                style={[
                  styles.gridItem,
                  index % 2 === 0 ? styles.gridLeft : styles.gridRight,
                ]}
              >
                <DebateCard
                  debate={debate}
                  onPress={() => onOpenDebate(debate.id)}
                  compact
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {tab === 'debates' ? "You haven't hosted any debates yet" : "You haven't liked any debates yet"}
            </Text>
          </View>
        )}
      </ScrollView>

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
              {/* Avatar */}
              <Pressable
                style={({ pressed }) => [styles.avatarPickerRow, pressed && styles.pressed]}
                onPress={() => { void handlePickAvatar(); }}
              >
                <View style={styles.editAvatar}>
                  {editAvatarUri ? (
                    <Image source={{ uri: editAvatarUri }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{getInitials(editName || userName)}</Text>
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
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '300',
  },
  profileBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C35F8',
    overflow: 'hidden',
  },
  editAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C35F8',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '300',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    borderWidth: 2,
    borderColor: colors.background,
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
    fontSize: 24,
    fontWeight: '300',
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '400',
  },
  bioBlock: {
    gap: spacing.xs,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '400',
  },
  usernameText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '400',
  },
  sessionEmail: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '300',
  },
  bioText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '300',
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.textPrimary,
  },
  primaryActionText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '400',
  },
  secondaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  secondaryActionText: {
    color: colors.textPrimary,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  gridItem: {
    width: '50%',
    marginBottom: spacing.md,
  },
  gridLeft: {
    paddingRight: spacing.sm,
  },
  gridRight: {
    paddingLeft: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  // Modal
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  editSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderCurve: 'continuous',
    backgroundColor: '#111114',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
    gap: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
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
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '400',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  avatarPickerLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  editField: {
    gap: spacing.sm,
  },
  editLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '400',
  },
  editInput: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '300',
  },
  editTextarea: {
    minHeight: 90,
    padding: spacing.md,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '300',
  },
  errorText: {
    color: '#FF7A7A',
    fontSize: 13,
    fontWeight: '400',
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.textPrimary,
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '400',
  },
  pressed: {
    opacity: 0.88,
  },
});
