import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { trackLog, withTrace } from './opscompanion';
import { getSupabaseClient } from './supabase';

export async function getCurrentSession() {
  return withTrace('auth.get_current_session', { feature: 'auth' }, async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      await trackLog({
        eventName: 'auth.get_current_session.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'auth' },
      });
      throw error;
    }

    return data.session;
  });
}

export async function signInWithPassword(email: string, password: string) {
  return withTrace('auth.sign_in', { feature: 'auth' }, async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await trackLog({
        eventName: 'auth.sign_in.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'auth' },
      });
      throw error;
    }

    await trackLog({
      eventName: 'auth.sign_in.succeeded',
      body: { userId: data.user?.id ?? null },
      attributes: { feature: 'auth' },
    });

    return data.session;
  });
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name: string,
  avatarUrl?: string | null,
) {
  return withTrace('auth.sign_up', { feature: 'auth' }, async () => {
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
      await trackLog({
        eventName: 'auth.sign_up.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'auth' },
      });
      throw error;
    }

    await trackLog({
      eventName: 'auth.sign_up.succeeded',
      body: { userId: data.user?.id ?? null },
      attributes: { feature: 'auth' },
    });

    return {
      session: data.session,
      user: data.user,
    };
  });
}

export async function updateUserProfile(name: string, avatarUrl?: string | null) {
  return withTrace('auth.update_user_profile', { feature: 'profile' }, async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: name,
        avatar_url: avatarUrl ?? null,
      },
    });

    if (error) {
      await trackLog({
        eventName: 'profile.update.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'profile' },
      });
      throw error;
    }

    await trackLog({
      eventName: 'profile.update.succeeded',
      body: { userId: data.user?.id ?? null },
      attributes: { feature: 'profile' },
    });

    return data.user;
  });
}

export async function signOut() {
  return withTrace('auth.sign_out', { feature: 'auth' }, async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      await trackLog({
        eventName: 'auth.sign_out.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'auth' },
      });
      throw error;
    }

    await trackLog({
      eventName: 'auth.sign_out.succeeded',
      attributes: { feature: 'auth' },
    });
  });
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
