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
import { COIN_PACKAGES, GIFT_CATALOG, getCoinBalance, purchaseCoins, sendGift } from '../lib/gifts';
import { colors, radii, spacing } from '../theme';

type GiftPickerProps = {
  visible: boolean;
  onClose: () => void;
  senderId: string;
  senderName: string;
  recipientId: string;
  debateId: string;
  onGiftSent: () => void;
};

type ActiveSheet = 'gifts' | 'coins';

export function GiftPicker({
  visible,
  onClose,
  senderId,
  senderName,
  recipientId,
  debateId,
  onGiftSent,
}: GiftPickerProps) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('gifts');
  const [coinBalance, setCoinBalance] = useState(0);
  const [sending, setSending] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    getCoinBalance(senderId).then(setCoinBalance).catch(() => {});
  }, [visible, senderId]);

  async function handleSendGift(giftTypeId: string, coinCost: number) {
    if (coinBalance < coinCost) {
      setActiveSheet('coins');
      return;
    }
    setSending(giftTypeId);
    setError(null);
    try {
      await sendGift(debateId, senderId, senderName, recipientId, giftTypeId);
      setCoinBalance((prev) => prev - coinCost);
      onGiftSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send gift.');
    } finally {
      setSending(null);
    }
  }

  async function handlePurchaseCoins(coinAmount: number) {
    setPurchasing(coinAmount);
    setError(null);
    try {
      await purchaseCoins(senderId, coinAmount);
      setCoinBalance((prev) => prev + coinAmount);
      setActiveSheet('gifts');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add coins.');
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header: tabs + balance */}
          <View style={styles.header}>
            <View style={styles.tabs}>
              <Pressable style={styles.tab} onPress={() => setActiveSheet('gifts')}>
                <Text style={[styles.tabText, activeSheet === 'gifts' && styles.tabTextActive]}>
                  Send Gift
                </Text>
                {activeSheet === 'gifts' ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
              <Pressable style={styles.tab} onPress={() => setActiveSheet('coins')}>
                <Text style={[styles.tabText, activeSheet === 'coins' && styles.tabTextActive]}>
                  Buy Coins
                </Text>
                {activeSheet === 'coins' ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
            </View>
            <View style={styles.balancePill}>
              <Text style={styles.coinEmoji}>🪙</Text>
              <Text style={styles.balanceText}>{coinBalance.toLocaleString()}</Text>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {activeSheet === 'gifts' ? (
            <View style={styles.giftGrid}>
              {GIFT_CATALOG.map((gift) => {
                const canAfford = coinBalance >= gift.coin_cost;
                const isSending = sending === gift.id;
                return (
                  <Pressable
                    key={gift.id}
                    style={({ pressed }) => [
                      styles.giftCard,
                      !canAfford && styles.giftCardFaded,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => { void handleSendGift(gift.id, gift.coin_cost); }}
                    disabled={sending !== null}
                  >
                    {isSending ? (
                      <ActivityIndicator color={colors.textPrimary} size="small" style={styles.giftSpinner} />
                    ) : (
                      <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                    )}
                    <Text style={styles.giftName}>{gift.name}</Text>
                    <View style={styles.giftCostRow}>
                      <Text style={styles.giftCoinIcon}>🪙</Text>
                      <Text style={[styles.giftCostText, !canAfford && styles.giftCostFaded]}>
                        {gift.coin_cost}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.packageList}>
              <Text style={styles.packageNote}>
                Coins are used to send gifts to debate hosts. Hosts earn diamonds they can convert to cash.
              </Text>
              {COIN_PACKAGES.map((pkg) => (
                <Pressable
                  key={pkg.coins}
                  style={({ pressed }) => [styles.packageRow, pressed && styles.pressed]}
                  onPress={() => { void handlePurchaseCoins(pkg.coins); }}
                  disabled={purchasing !== null}
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
                  {purchasing === pkg.coins ? (
                    <ActivityIndicator color={colors.textPrimary} size="small" />
                  ) : (
                    <View style={styles.priceTag}>
                      <Text style={styles.priceText}>{pkg.price}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
              <Text style={styles.demoNote}>
                Demo mode — coins are credited instantly.{'\n'}Connect Stripe to enable real payments.
              </Text>
            </ScrollView>
          )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  tab: {
    position: 'relative',
    paddingBottom: spacing.sm,
  },
  tabText: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '400',
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.textPrimary,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  coinEmoji: {
    fontSize: 14,
  },
  balanceText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF7A7A',
    fontSize: 13,
    fontWeight: '400',
  },
  // Gift grid
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  giftCard: {
    width: '30%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 96,
    justifyContent: 'center',
  },
  giftCardFaded: {
    opacity: 0.45,
  },
  giftEmoji: {
    fontSize: 32,
  },
  giftSpinner: {
    height: 32,
  },
  giftName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  giftCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  giftCoinIcon: {
    fontSize: 10,
  },
  giftCostText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  giftCostFaded: {
    color: colors.textFaint,
  },
  // Coin packages
  packageList: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  packageNote: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  demoNote: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
});
