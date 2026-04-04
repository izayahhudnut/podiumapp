import { getSupabaseClient } from './supabase';
import { trackLog, withTrace } from './opscompanion';

export type LiveKitCredentials = {
  token: string;
  url: string;
};

export async function fetchLivekitToken(
  debateId: string,
  participantName: string,
  isHost: boolean,
): Promise<LiveKitCredentials> {
  return withTrace(
    'livekit.fetch_token',
    { feature: 'livekit', 'debate.id': debateId, 'participant.is_host': isHost },
    async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke<LiveKitCredentials>('livekit-token', {
        body: { debateId, participantName, isHost },
      });

      if (error) {
        await trackLog({
          eventName: 'livekit.fetch_token.failed',
          severity: 'ERROR',
          body: error.message,
          attributes: { feature: 'livekit', 'debate.id': debateId, 'participant.is_host': isHost },
        });
        throw new Error(`Failed to get video token: ${error.message}`);
      }

      if (!data?.token || !data?.url) {
        await trackLog({
          eventName: 'livekit.fetch_token.invalid_response',
          severity: 'ERROR',
          attributes: { feature: 'livekit', 'debate.id': debateId, 'participant.is_host': isHost },
        });
        throw new Error('Invalid token response from server');
      }

      await trackLog({
        eventName: 'livekit.fetch_token.succeeded',
        attributes: { feature: 'livekit', 'debate.id': debateId, 'participant.is_host': isHost },
      });

      return data;
    },
  );
}
