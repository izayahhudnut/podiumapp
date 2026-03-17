import { StyleSheet, Text, View } from 'react-native';

import { FactCheckItem } from '../data/mockDebates';
import { colors, radii, spacing } from '../theme';

type FactCheckStripProps = {
  factCheck: FactCheckItem;
};

export function FactCheckStrip({ factCheck }: FactCheckStripProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>AI fact-check</Text>
      <Text style={styles.claim}>{factCheck.claim}</Text>
      <Text style={styles.verdict}>{factCheck.verdict}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxWidth: 280,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.overlayStrong,
    borderWidth: 1,
    borderColor: colors.borderOverlay,
    gap: 2,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  claim: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  verdict: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '400',
  },
});
