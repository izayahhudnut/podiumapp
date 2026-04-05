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

export async function getPublicProfile(userId: string): Promise<ProfileRecord | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single<ProfileRecord>();
  return data ?? null;
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

export async function followUser(followerId: string, followingId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('follows')
    .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id' });
  if (error) throw error;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .returns<{ following_id: string }[]>();
  if (error) throw error;
  return (data ?? []).map((row) => row.following_id);
}

export async function getFollowerCount(userId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { count } = await supabase
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId);
  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { count } = await supabase
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId);
  return count ?? 0;
}

export async function getSavedDebates(userId: string): Promise<DebateRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debate_saves')
    .select('debates(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<{ debates: DebateRecord }[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.debates).filter(Boolean);
}

export async function getSavedDebateIds(userId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('debate_saves')
    .select('debate_id')
    .eq('user_id', userId)
    .returns<{ debate_id: string }[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.debate_id);
}

export async function saveDebate(userId: string, debateId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('debate_saves')
    .upsert({ user_id: userId, debate_id: debateId }, { onConflict: 'user_id,debate_id' });

  if (error) {
    throw error;
  }
}

export async function unsaveDebate(userId: string, debateId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('debate_saves')
    .delete()
    .eq('user_id', userId)
    .eq('debate_id', debateId);

  if (error) {
    throw error;
  }
}
