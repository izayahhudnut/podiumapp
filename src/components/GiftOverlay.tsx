import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { GIFT_CATALOG } from '../lib/gifts';

export type GiftOverlayItem = {
  id: string;
  giftTypeId: string;
  senderName: string;
  xPercent: number; // left offset: 5–65
};

type GiftBubbleProps = {
  item: GiftOverlayItem;
  onDone: (id: string) => void;
};

function GiftBubble({ item, onDone }: GiftBubbleProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.4)).current;

  const gift = GIFT_CATALOG.find((g) => g.id === item.giftTypeId);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -200,
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onDone(item.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!gift) return null;

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          left: `${item.xPercent}%`,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <Text style={styles.emoji}>{gift.emoji}</Text>
      <View style={styles.labelGroup}>
        <Text style={styles.senderName}>{item.senderName}</Text>
        <Text style={styles.giftName}>{gift.name}</Text>
      </View>
    </Animated.View>
  );
}

type GiftOverlayProps = {
  items: GiftOverlayItem[];
  onItemDone: (id: string) => void;
};

export function GiftOverlay({ items, onItemDone }: GiftOverlayProps) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {items.map((item) => (
        <GiftBubble key={item.id} item={item} onDone={onItemDone} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    bottom: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  emoji: {
    fontSize: 26,
  },
  labelGroup: {
    gap: 1,
  },
  senderName: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '400',
  },
  giftName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
