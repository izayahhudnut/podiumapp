import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COIN_PACKAGES: Record<string, { coins: number; priceCents: number; label: string }> = {
  starter: { coins: 100,  priceCents: 99,   label: '100 Podium Coins' },
  popular: { coins: 500,  priceCents: 399,  label: '500 Podium Coins' },
  value:   { coins: 1200, priceCents: 799,  label: '1,200 Podium Coins' },
  creator: { coins: 2500, priceCents: 1499, label: '2,500 Podium Coins' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appScheme = Deno.env.get('APP_SCHEME') ?? 'podiumlive';

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { packageId } = await req.json() as { packageId: string };
    const pkg = COIN_PACKAGES[packageId];
    if (!pkg) {
      return new Response(
        JSON.stringify({ error: `Unknown package: ${packageId}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pkg.priceCents,
            product_data: {
              name: pkg.label,
              description: 'Podium coins used to send gifts to debate hosts',
              images: [],
            },
          },
        },
      ],
      metadata: {
        user_id: user.id,
        package_id: packageId,
        coin_amount: String(pkg.coins),
      },
      customer_email: user.email,
      success_url: `${appScheme}://coins/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appScheme}://coins/cancel`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
