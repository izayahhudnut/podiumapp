import type { RealtimeChannel } from '@supabase/supabase-js';
import { env } from './env';
import { getSupabaseClient } from './supabase';

export type GiftType = {
  id: string;
  name: string;
  emoji: string;
  coin_cost: number;
  diamond_value: number;
};

export type GiftEvent = {
  id: string;
  debate_id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  gift_type_id: string;
  coin_amount: number;
  created_at: string;
};

export type CoinPackage = {
  id: string;
  coins: number;
  priceLabel: string;
  priceCents: number;
  bonus: string;
};

export const GIFT_CATALOG: GiftType[] = [
  { id: 'rose',    name: 'Rose',    emoji: '🌹', coin_cost: 10,  diamond_value: 5   },
  { id: 'fire',    name: 'Fire',    emoji: '🔥', coin_cost: 25,  diamond_value: 12  },
  { id: 'star',    name: 'Star',    emoji: '⭐', coin_cost: 50,  diamond_value: 25  },
  { id: 'diamond', name: 'Diamond', emoji: '💎', coin_cost: 100, diamond_value: 55  },
  { id: 'rocket',  name: 'Rocket',  emoji: '🚀', coin_cost: 200, diamond_value: 110 },
  { id: 'crown',   name: 'Crown',   emoji: '👑', coin_cost: 500, diamond_value: 280 },
];

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'starter', coins: 100, priceLabel: '$0.99', priceCents: 99, bonus: '' },
  { id: 'popular', coins: 500, priceLabel: '$3.99', priceCents: 399, bonus: 'Popular' },
  { id: 'value', coins: 1200, priceLabel: '$7.99', priceCents: 799, bonus: 'Best Value' },
  { id: 'creator', coins: 2500, priceLabel: '$14.99', priceCents: 1499, bonus: '' },
];

export async function getCoinBalance(userId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('coin_balances')
    .select('balance')
    .eq('user_id', userId)
    .single<{ balance: number }>();
  return data?.balance ?? 0;
}

export async function getDiamondBalance(userId: string): Promise<{ balance: number; total_earned: number }> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('diamond_balances')
    .select('balance, total_earned')
    .eq('user_id', userId)
    .single<{ balance: number; total_earned: number }>();
  return data ?? { balance: 0, total_earned: 0 };
}

export function getCoinCheckoutUrl(userId: string, packageId?: string): string {
  if (!env.webUrl) {
    throw new Error('Coin checkout is not configured yet. Add EXPO_PUBLIC_WEB_URL.');
  }

  const url = new URL('/coins', env.webUrl);
  url.searchParams.set('userId', userId);
  if (packageId) {
    url.searchParams.set('package', packageId);
  }

  return url.toString();
}

export async function sendGift(
  debateId: string,
  senderId: string,
  senderName: string,
  recipientId: string,
  giftTypeId: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('send_gift', {
    p_debate_id: debateId,
    p_sender_id: senderId,
    p_sender_name: senderName,
    p_recipient_id: recipientId,
    p_gift_type_id: giftTypeId,
  });
  if (error) throw error;
  return data as string;
}

export function subscribeToGiftEvents(
  debateId: string,
  onGift: (event: GiftEvent) => void,
): RealtimeChannel {
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`gift-events:${debateId}`);

  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'gift_events',
      filter: `debate_id=eq.${debateId}`,
    },
    (payload) => {
      onGift(payload.new as GiftEvent);
    },
  );

  channel.subscribe();
  return channel;
}
