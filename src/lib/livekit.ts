import { getSupabaseClient } from './supabase';

export type LiveKitCredentials = {
  token: string;
  url: string;
};

export async function fetchLivekitToken(
  debateId: string,
  participantName: string,
  isHost: boolean,
): Promise<LiveKitCredentials> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<LiveKitCredentials>('livekit-token', {
    body: { debateId, participantName, isHost },
  });

  if (error) {
    throw new Error(`Failed to get video token: ${error.message}`);
  }

  if (!data?.token || !data?.url) {
    throw new Error('Invalid token response from server');
  }

  return data;
}
