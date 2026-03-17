import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { getSupabaseClient } from './supabase';

export async function getCurrentSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name: string,
  avatarUrl?: string | null,
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        avatar_url: avatarUrl ?? null,
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    session: data.session,
    user: data.user,
  };
}

export async function updateUserProfile(name: string, avatarUrl?: string | null) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: name,
      avatar_url: avatarUrl ?? null,
    },
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
