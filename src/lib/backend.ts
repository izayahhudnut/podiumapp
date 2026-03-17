import { getSupabaseClient } from './supabase';

export async function checkBackendConnection() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return true;
}
