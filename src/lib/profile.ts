import { getSupabaseClient } from './supabase';
import type { DebateRecord } from './debates';

export type ProfileRecord = {
  id: string;
  user_id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

export async function getOrCreateProfile(userId: string): Promise<ProfileRecord> {
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single<ProfileRecord>();

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: userId })
    .select('*')
    .single<ProfileRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertProfile(
  userId: string,
  updates: { username?: string | null; bio?: string | null; avatar_url?: string | null },
): Promise<ProfileRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select('*')
    .single<ProfileRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserDebates(userId: string): Promise<DebateRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debates')
    .select('*')
    .eq('host_user_id', userId)
    .order('created_at', { ascending: false })
    .returns<DebateRecord[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLikedDebates(userId: string): Promise<DebateRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debate_likes')
    .select('debates(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<{ debates: DebateRecord }[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.debates).filter(Boolean);
}

export async function getLikedDebateIds(userId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debate_likes')
    .select('debate_id')
    .eq('user_id', userId)
    .returns<{ debate_id: string }[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.debate_id);
}

export async function likeDebate(userId: string, debateId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('debate_likes')
    .upsert({ user_id: userId, debate_id: debateId }, { onConflict: 'user_id,debate_id' });

  if (error) {
    throw error;
  }
}

export async function unlikeDebate(userId: string, debateId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('debate_likes')
    .delete()
    .eq('user_id', userId)
    .eq('debate_id', debateId);

  if (error) {
    throw error;
  }
}
