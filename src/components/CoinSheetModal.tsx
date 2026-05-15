import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Linking from 'expo-linking';
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
import {
  COIN_PACKAGES,
  getCoinBalance,
  createCoinCheckoutSession,
  createCustomerPortalSession,
} from '../lib/gifts';
import { colors, radii, spacing } from '../theme';

type CoinSheetModalProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
};

export function CoinSheetModal({ visible, userId, onClose }: CoinSheetModalProps) {
  const [coinBalance, setCoinBalance] = useState(0);
  const [redirectingPackageId, setRedirectingPackageId] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshBalance() {
    try {
      setCoinBalance(await getCoinBalance(userId));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!visible) return;
    setError(null);
    void refreshBalance();
  }, [visible, userId]);

  // Refresh balance when user returns from Stripe checkout
  useEffect(() => {
    if (!visible) return;
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') void refreshBalance();
    }
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [visible, userId]);

  async function handleBuy(packageId: string) {
    setRedirectingPackageId(packageId);
    setError(null);
    try {
      const url = await createCoinCheckoutSession(packageId);
      await Linking.openURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open checkout.');
    } finally {
      setRedirectingPackageId(null);
    }
  }

  async function handleManagePayments() {
    setOpeningPortal(true);
    setError(null);
    try {
      const url = await createCustomerPortalSession();
      await Linking.openURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open payment portal.');
    } finally {
      setOpeningPortal(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Buy Coins</Text>
              <Text style={styles.subtitle}>Send gifts to your favourite debate hosts</Text>
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Balance pill */}
          <View style={styles.balanceRow}>
            <View style={styles.balancePill}>
              <Text style={styles.coinEmoji}>🪙</Text>
              <Text style={styles.balanceLabel}>Your balance</Text>
              <Text style={styles.balanceValue}>{coinBalance.toLocaleString()} coins</Text>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Packages */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.packageList}>
            {COIN_PACKAGES.map((pkg) => (
              <Pressable
                key={pkg.id}
                style={({ pressed }) => [styles.packageRow, pressed && styles.pressed]}
                onPress={() => { void handleBuy(pkg.id); }}
                disabled={redirectingPackageId !== null || openingPortal}
              >
                <View style={styles.packageLeft}>
                  <Text style={styles.packageCoinIcon}>🪙</Text>
                  <View>
                    <View style={styles.packageTitleRow}>
                      <Text style={styles.packageAmount}>
                        {pkg.coins.toLocaleString()} Coins
                      </Text>
                      {pkg.bonus ? (
                        <View style={styles.bonusPill}>
                          <Text style={styles.bonusText}>{pkg.bonus}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.packageSub}>Podium Coins</Text>
                  </View>
                </View>
                {redirectingPackageId === pkg.id ? (
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>{pkg.priceLabel}</Text>
                  </View>
                )}
              </Pressable>
            ))}

            {/* Manage saved payment methods */}
            <Pressable
              style={({ pressed }) => [styles.manageRow, pressed && styles.pressed]}
              onPress={() => { void handleManagePayments(); }}
              disabled={redirectingPackageId !== null || openingPortal}
            >
              {openingPortal ? (
                <ActivityIndicator color={colors.textDim} size="small" />
              ) : (
                <Ionicons name="card-outline" size={16} color={colors.textDim} />
              )}
              <Text style={styles.manageText}>Manage saved payment methods</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textFaint} style={styles.manageChevron} />
            </Pressable>

            <Text style={styles.footerNote}>
              Secure checkout powered by Stripe. Your card is saved for faster future purchases.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderCurve: 'continuous',
    backgroundColor: '#111114',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 44,
    gap: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '400',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  balanceRow: {
    alignItems: 'flex-start',
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(140, 53, 248, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(140, 53, 248, 0.35)',
  },
  coinEmoji: {
    fontSize: 16,
  },
  balanceLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '400',
  },
  balanceValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF7A7A',
    fontSize: 13,
    fontWeight: '400',
  },
  packageList: {
    gap: spacing.md,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  packageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  packageCoinIcon: {
    fontSize: 24,
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  packageAmount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  bonusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(140, 53, 248, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(140, 53, 248, 0.5)',
  },
  bonusText: {
    color: '#C07EFF',
    fontSize: 10,
    fontWeight: '600',
  },
  packageSub: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  priceTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.textPrimary,
  },
  priceText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    marginTop: spacing.xs,
  },
  manageText: {
    flex: 1,
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '400',
  },
  manageChevron: {
    marginLeft: 'auto',
  },
  footerNote: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.82,
  },
});
