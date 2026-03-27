import type { RealtimeChannel } from '@supabase/supabase-js';
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

export const GIFT_CATALOG: GiftType[] = [
  { id: 'rose',    name: 'Rose',    emoji: '🌹', coin_cost: 10,  diamond_value: 5   },
  { id: 'fire',    name: 'Fire',    emoji: '🔥', coin_cost: 25,  diamond_value: 12  },
  { id: 'star',    name: 'Star',    emoji: '⭐', coin_cost: 50,  diamond_value: 25  },
  { id: 'diamond', name: 'Diamond', emoji: '💎', coin_cost: 100, diamond_value: 55  },
  { id: 'rocket',  name: 'Rocket',  emoji: '🚀', coin_cost: 200, diamond_value: 110 },
  { id: 'crown',   name: 'Crown',   emoji: '👑', coin_cost: 500, diamond_value: 280 },
];

export const COIN_PACKAGES = [
  { coins: 100,  price: '$0.99',  bonus: ''           },
  { coins: 500,  price: '$3.99',  bonus: 'Popular'    },
  { coins: 1200, price: '$7.99',  bonus: 'Best Value' },
  { coins: 2500, price: '$14.99', bonus: ''           },
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

// Demo: credits coins immediately. Replace with Stripe checkout in production.
export async function purchaseCoins(userId: string, amount: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('add_coins', {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) throw error;
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
