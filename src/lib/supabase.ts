import 'react-native-url-polyfill/auto';

import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';

import { env, getEnvErrorMessage } from './env';
import { sessionStorage } from './sessionStorage';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!env.isConfigured) {
    throw new Error(getEnvErrorMessage() ?? 'Supabase is not configured.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.supabaseUrl!, env.supabaseKey!, {
      auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    });
  }

  return supabaseClient;
}
