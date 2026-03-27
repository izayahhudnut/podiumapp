import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabaseClient } from './supabase';

export type DebateRecord = {
  id: string;
  host_user_id: string;
  title: string;
  topic: string;
  description: string | null;
  is_public: boolean;
  status: 'live' | 'scheduled' | 'ended';
  scheduled_for: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

export type DebateChangePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: DebateRecord | null;
  old: Partial<DebateRecord> & { id?: string };
};

export type DebatePresencePayload = {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  is_host: boolean;
  joined_at: string;
  presence_ref?: string;
};

export type DebatePresenceState = Record<string, DebatePresencePayload[]>;

export type DebateMessageRecord = {
  id: string;
  debate_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  body: string;
  created_at: string;
};

export type CreateDebateInput = {
  hostUserId: string;
  title: string;
  topic: string;
  description: string;
  isPublic: boolean;
  scheduledFor?: string | null;
  thumbnailUrl?: string | null;
};

export type SendDebateMessageInput = {
  debateId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  body: string;
};

export async function createDebate(input: CreateDebateInput) {
  const supabase = getSupabaseClient();
  const isScheduled = Boolean(input.scheduledFor);
  const { data, error } = await supabase
    .from('debates')
    .insert({
      host_user_id: input.hostUserId,
      title: input.title,
      topic: input.topic,
      description: input.description,
      is_public: input.isPublic,
      status: isScheduled ? 'scheduled' : 'live',
      scheduled_for: input.scheduledFor ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
    })
    .select('*')
    .single<DebateRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function startScheduledDebate(debateId: string, hostUserId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debates')
    .update({ status: 'live', scheduled_for: null })
    .eq('id', debateId)
    .eq('host_user_id', hostUserId)
    .select('*')
    .single<DebateRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function endDebate(debateId: string, hostUserId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debates')
    .update({ status: 'ended' })
    .eq('id', debateId)
    .eq('host_user_id', hostUserId)
    .select('*')
    .single<DebateRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteDebate(debateId: string, hostUserId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('debates')
    .delete()
    .eq('id', debateId)
    .eq('host_user_id', hostUserId);

  if (error) {
    throw error;
  }
}

export async function getPublicLiveDebates() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debates')
    .select('*')
    .eq('status', 'live')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .returns<DebateRecord[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPublicScheduledDebates() {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('debates')
    .select('*')
    .eq('status', 'scheduled')
    .eq('is_public', true)
    .gte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .returns<DebateRecord[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDebateMessages(debateId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debate_messages')
    .select('*')
    .eq('debate_id', debateId)
    .order('created_at', { ascending: true })
    .returns<DebateMessageRecord[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function sendDebateMessage(input: SendDebateMessageInput) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debate_messages')
    .insert({
      debate_id: input.debateId,
      user_id: input.userId,
      user_name: input.userName,
      user_avatar: input.userAvatar ?? null,
      body: input.body,
    })
    .select('*')
    .single<DebateMessageRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export function subscribeToDebateMessages(
  debateId: string,
  onInsert: (message: DebateMessageRecord) => void,
) {
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`debate-messages:${debateId}`);

  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'debate_messages',
      filter: `debate_id=eq.${debateId}`,
    },
    (payload) => {
      onInsert(payload.new as DebateMessageRecord);
    },
  );

  channel.subscribe();

  return channel;
}

export function subscribeToDebates(
  onChange: (payload: DebateChangePayload) => void,
) {
  const supabase = getSupabaseClient();
  const channel = supabase.channel('debates-feed');

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'debates',
    },
    (payload) => {
      onChange({
        eventType: payload.eventType as DebateChangePayload['eventType'],
        new: payload.new as DebateRecord | null,
        old: (payload.old as DebateChangePayload['old']) ?? {},
      });
    },
  );

  channel.subscribe();

  return channel;
}

type SubscribeToDebatePresenceOptions = {
  onSync: (state: DebatePresenceState) => void;
  presenceKey?: string;
  track?: DebatePresencePayload;
};

export function subscribeToDebatePresence(
  debateId: string,
  options: SubscribeToDebatePresenceOptions,
) {
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`debate-presence:${debateId}`, {
    config: {
      presence: {
        key: options.presenceKey ?? '',
      },
    },
  });

  channel.on('presence', { event: 'sync' }, () => {
    options.onSync(channel.presenceState<DebatePresencePayload>() as DebatePresenceState);
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED' && options.track) {
      await channel.track(options.track);
    }
  });

  return channel;
}

export function unsubscribeFromChannel(channel: RealtimeChannel) {
  const supabase = getSupabaseClient();
  void supabase.removeChannel(channel);
}
