import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, spacing } from '../theme';

export type NavTab = 'home' | 'discover' | 'chat' | 'profile';

type AppNavProps = {
  active: NavTab;
  guestMode?: boolean;
  onTabChange: (tab: NavTab) => void;
  onGoLive?: () => void;
  onSchedule?: () => void;
  onUploadClip?: () => void;
  onAudioRoom?: () => void;
};

type CreateAction = {
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradColors: readonly [string, string];
};

const CREATE_ACTIONS: CreateAction[] = [
  {
    label: 'Go Live',
    sublabel: 'Start now',
    icon: 'radio-outline',
    gradColors: ['#7C3AED', '#FF1F6A'],
  },
  {
    label: 'Schedule',
    sublabel: 'Plan ahead',
    icon: 'calendar-outline',
    gradColors: ['#3B82F6', '#1D4ED8'],
  },
  {
    label: 'Upload Clip',
    sublabel: 'Share video',
    icon: 'cloud-upload-outline',
    gradColors: ['#F97316', '#EF4444'],
  },
  {
    label: 'Audio Room',
    sublabel: 'Voice only',
    icon: 'headset-outline',
    gradColors: ['#22C55E', '#16A34A'],
  },
];

export function AppNav({
  active,
  guestMode = false,
  onTabChange,
  onGoLive,
  onSchedule,
  onUploadClip,
  onAudioRoom,
}: AppNavProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const handlers = [onGoLive, onSchedule, onUploadClip, onAudioRoom];

  function handleCreateAction(index: number) {
    setCreateOpen(false);
    handlers[index]?.();
  }

  return (
    <>
      {/* Create menu overlay */}
      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateOpen(false)}
      >
        <Pressable style={styles.createOverlay} onPress={() => setCreateOpen(false)}>
          <View style={styles.createMenu}>
            {CREATE_ACTIONS.map((action, i) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [styles.createTile, pressed && styles.pressed]}
                onPress={() => handleCreateAction(i)}
              >
                <LinearGradient
                  colors={action.gradColors}
                  style={styles.createIconBg}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={action.icon} size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.createTileLabel}>{action.label}</Text>
                <Text style={styles.createTileSub}>{action.sublabel}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Bottom nav bar */}
      <View style={styles.navContainer}>
        <View style={styles.nav}>
          <NavButton
            icon="home"
            label="Home"
            active={active === 'home'}
            onPress={() => onTabChange('home')}
          />
          <NavButton
            icon="search"
            label="Discover"
            active={active === 'discover'}
            onPress={() => onTabChange('discover')}
          />

          {/* Center create button */}
          <Pressable
            style={({ pressed }) => [styles.createButtonWrap, pressed && styles.createPressed]}
            onPress={() => {
              if (guestMode) return;
              setCreateOpen(true);
            }}
          >
            <LinearGradient
              colors={['#7C3AED', '#FF1F6A']}
              style={styles.createGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={32} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <NavButton
            icon="chatbubble"
            label="Chat"
            active={active === 'chat'}
            onPress={() => onTabChange('chat')}
          />
          <NavButton
            icon="person"
            label="Profile"
            active={active === 'profile'}
            onPress={() => onTabChange('profile')}
          />
        </View>
      </View>
    </>
  );
}

type NavButtonProps = {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
};

function NavButton({ icon, label, active, onPress }: NavButtonProps) {
  const activeIcon = icon as keyof typeof Ionicons.glyphMap;
  const inactiveIcon = `${icon}-outline` as keyof typeof Ionicons.glyphMap;

  return (
    <Pressable
      style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
      onPress={onPress}
    >
      {active && <View style={styles.activeIndicator} />}
      <Ionicons
        name={active ? activeIcon : inactiveIcon}
        size={24}
        color={active ? '#FFFFFF' : 'rgba(255,255,255,0.38)'}
      />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.nav,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 52,
    paddingVertical: 4,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    width: 22,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: '#7C3AED',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: '#FFFFFF',
  },
  // Center create button
  createButtonWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  createGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  pressed: {
    opacity: 0.8,
  },
  // Create overlay modal
  createOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
    paddingBottom: 110,
    paddingHorizontal: spacing.lg,
  },
  createMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  createTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  createIconBg: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTileLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  createTileSub: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: -4,
  },
});
