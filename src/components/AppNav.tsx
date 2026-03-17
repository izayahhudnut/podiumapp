import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

type Screen = 'home' | 'create' | 'room';

type AppNavProps = {
  active: 'home' | 'create' | 'profile';
  onChange: (screen: 'home' | 'create' | 'profile') => void;
};

export function AppNav({ active, onChange }: AppNavProps) {
  return (
    <View style={styles.nav}>
      <Pressable style={styles.sideButton} onPress={() => onChange('home')}>
        <Text style={[styles.sideLabel, active === 'home' && styles.activeLabel]}>Home</Text>
      </Pressable>

      <Pressable style={styles.createButton} onPress={() => onChange('create')}>
        <Text style={styles.createLabel}>+</Text>
      </Pressable>

      <Pressable style={styles.sideButton} onPress={() => onChange('profile')}>
        <Text style={[styles.sideLabel, active === 'profile' && styles.activeLabel]}>Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    backgroundColor: colors.nav,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  sideButton: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  sideLabel: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '500',
  },
  activeLabel: {
    color: colors.textPrimary,
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
  },
  createLabel: {
    color: colors.background,
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '400',
  },
});
