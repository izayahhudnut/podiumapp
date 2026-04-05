import type { RealtimeChannel } from '@supabase/supabase-js';

import { trackLog, withTrace } from './opscompanion';
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
  fact_check_enabled: boolean;
  audience_comments_enabled: boolean;
  ask_to_join_enabled: boolean;
  ended_at: string | null;
  total_joined_count: number;
  total_message_count: number;
  duration_seconds: number;
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
  stage_state?: DebateStageState;
  join_state?: DebateJoinState;
  request_to_join?: boolean;
  presence_ref?: string;
};

export type DebatePresenceState = Record<string, DebatePresencePayload[]>;

export type DebateStageParticipantState = {
  on_stage: boolean;
  muted: boolean;
  removed: boolean;
};

export type DebateStageState = Record<string, DebateStageParticipantState>;

export type DebateJoinParticipantState = {
  requested: boolean;
  admitted: boolean;
};

export type DebateJoinState = Record<string, DebateJoinParticipantState>;

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
  factCheckEnabled: boolean;
  audienceCommentsEnabled: boolean;
  askToJoinEnabled: boolean;
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
  return withTrace(
    'debates.create',
    {
      feature: 'debates',
      'debate.is_public': input.isPublic,
      'debate.is_scheduled': Boolean(input.scheduledFor),
    },
    async () => {
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
          fact_check_enabled: input.factCheckEnabled,
          audience_comments_enabled: input.audienceCommentsEnabled,
          ask_to_join_enabled: input.askToJoinEnabled,
          status: isScheduled ? 'scheduled' : 'live',
          scheduled_for: input.scheduledFor ?? null,
          thumbnail_url: input.thumbnailUrl ?? null,
        })
        .select('*')
        .single<DebateRecord>();

      if (error) {
        await trackLog({
          eventName: 'debates.create.failed',
          severity: 'ERROR',
          body: error.message,
          attributes: { feature: 'debates', 'debate.is_public': input.isPublic },
        });
        throw error;
      }

      await trackLog({
        eventName: 'debates.create.succeeded',
        body: { debateId: data.id, status: data.status },
        attributes: { feature: 'debates', 'debate.is_public': data.is_public },
      });

      return data;
    },
  );
}

export async function startScheduledDebate(debateId: string, hostUserId: string) {
  return withTrace(
    'debates.start_scheduled',
    { feature: 'debates', 'debate.id': debateId },
    async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('debates')
        .update({ status: 'live', scheduled_for: null })
        .eq('id', debateId)
        .eq('host_user_id', hostUserId)
        .select('*')
        .single<DebateRecord>();

      if (error) {
        await trackLog({
          eventName: 'debates.start_scheduled.failed',
          severity: 'ERROR',
          body: error.message,
          attributes: { feature: 'debates', 'debate.id': debateId },
        });
        throw error;
      }

      await trackLog({
        eventName: 'debates.start_scheduled.succeeded',
        body: { debateId: data.id },
        attributes: { feature: 'debates', 'debate.id': debateId },
      });

      return data;
    },
  );
}

export async function endDebate(debateId: string, hostUserId: string) {
  return withTrace('debates.end', { feature: 'debates', 'debate.id': debateId }, async () => {
    const supabase = getSupabaseClient();
    const endedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('debates')
      .update({
        status: 'ended',
        ended_at: endedAt,
      })
      .eq('id', debateId)
      .eq('host_user_id', hostUserId)
      .select('*')
      .single<DebateRecord>();

    if (error) {
      await trackLog({
        eventName: 'debates.end.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'debates', 'debate.id': debateId },
      });
      throw error;
    }

    await trackLog({
      eventName: 'debates.end.succeeded',
      body: { debateId: data.id },
      attributes: { feature: 'debates', 'debate.id': debateId },
    });

    return data;
  });
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

export async function endDebateWithStats(
  debateId: string,
  hostUserId: string,
  stats: { totalJoinedCount: number; totalMessageCount: number; durationSeconds: number },
) {
  return withTrace('debates.end_with_stats', { feature: 'debates', 'debate.id': debateId }, async () => {
    const supabase = getSupabaseClient();
    const endedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('debates')
      .update({
        status: 'ended',
        ended_at: endedAt,
        total_joined_count: stats.totalJoinedCount,
        total_message_count: stats.totalMessageCount,
        duration_seconds: stats.durationSeconds,
      })
      .eq('id', debateId)
      .eq('host_user_id', hostUserId)
      .select('*')
      .single<DebateRecord>();

    if (error) {
      await trackLog({
        eventName: 'debates.end_with_stats.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'debates', 'debate.id': debateId },
      });
      throw error;
    }

    await trackLog({
      eventName: 'debates.end_with_stats.succeeded',
      body: { debateId: data.id, totalJoinedCount: stats.totalJoinedCount },
      attributes: { feature: 'debates', 'debate.id': debateId },
    });

    return data;
  });
}

export async function getPublicLiveDebates() {
  return withTrace('debates.get_public_live', { feature: 'debates' }, async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('debates')
      .select('*')
      .eq('status', 'live')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .returns<DebateRecord[]>();

    if (error) {
      await trackLog({
        eventName: 'debates.get_public_live.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'debates' },
      });
      throw error;
    }

    return data;
  });
}

export async function getPublicScheduledDebates() {
  return withTrace('debates.get_public_scheduled', { feature: 'debates' }, async () => {
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
      await trackLog({
        eventName: 'debates.get_public_scheduled.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'debates' },
      });
      throw error;
    }

    return data;
  });
}

export async function getDebateMessages(debateId: string) {
  return withTrace('debates.get_messages', { feature: 'chat', 'debate.id': debateId }, async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('debate_messages')
      .select('*')
      .eq('debate_id', debateId)
      .order('created_at', { ascending: true })
      .returns<DebateMessageRecord[]>();

    if (error) {
      await trackLog({
        eventName: 'chat.get_messages.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'chat', 'debate.id': debateId },
      });
      throw error;
    }

    return data;
  });
}

export async function sendDebateMessage(input: SendDebateMessageInput) {
  return withTrace(
    'chat.send_message',
    { feature: 'chat', 'debate.id': input.debateId },
    async () => {
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
        await trackLog({
          eventName: 'chat.send_message.failed',
          severity: 'ERROR',
          body: error.message,
          attributes: { feature: 'chat', 'debate.id': input.debateId },
        });
        throw error;
      }

      await trackLog({
        eventName: 'chat.send_message.succeeded',
        body: { messageId: data.id },
        attributes: { feature: 'chat', 'debate.id': input.debateId },
      });

      return data;
    },
  );
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

export async function getPublicDebatesByUser(userId: string): Promise<DebateRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debates')
    .select('*')
    .eq('host_user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .returns<DebateRecord[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getLikeCount(debateId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { count } = await supabase
    .from('debate_likes')
    .select('id', { count: 'exact', head: true })
    .eq('debate_id', debateId);
  return count ?? 0;
}

export function subscribeToDebateLikeCount(
  debateId: string,
  onChange: (delta: number) => void,
): RealtimeChannel {
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`debate-likes:${debateId}`);

  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'debate_likes', filter: `debate_id=eq.${debateId}` },
    () => onChange(1),
  );

  channel.on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'debate_likes', filter: `debate_id=eq.${debateId}` },
    () => onChange(-1),
  );

  channel.subscribe();
  return channel;
}

export function subscribeToDebateEnd(
  debateId: string,
  onEnd: () => void,
): RealtimeChannel {
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`debate-end:${debateId}`);

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'debates',
      filter: `id=eq.${debateId}`,
    },
    (payload) => {
      const updated = payload.new as { status: string };
      if (updated.status === 'ended') {
        onEnd();
      }
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
