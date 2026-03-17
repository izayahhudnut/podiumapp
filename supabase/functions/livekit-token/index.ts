import { AccessToken } from 'npm:livekit-server-sdk@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const url = Deno.env.get('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !url) {
      return new Response(
        JSON.stringify({ error: 'LiveKit env vars not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { debateId, participantName, isHost } = await req.json() as {
      debateId: string;
      participantName: string;
      isHost: boolean;
    };

    if (!debateId || !participantName) {
      return new Response(
        JSON.stringify({ error: 'debateId and participantName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: '4h',
    });

    token.addGrant({
      roomJoin: true,
      room: debateId,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    return new Response(
      JSON.stringify({ token: jwt, url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
