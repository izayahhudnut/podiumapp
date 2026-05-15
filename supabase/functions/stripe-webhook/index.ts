import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeKey || !webhookSecret) {
      return new Response('Stripe env vars not configured', { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      return new Response(`Webhook signature verification failed: ${String(err)}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { user_id, package_id, coin_amount } = session.metadata ?? {};

      if (!user_id || !package_id || !coin_amount) {
        console.error('Missing metadata in checkout session', session.id);
        return new Response('Missing metadata', { status: 400 });
      }

      const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
      const { error } = await supabase.rpc('fulfill_coin_purchase', {
        p_user_id: user_id,
        p_session_id: session.id,
        p_payment_intent_id: session.payment_intent as string ?? null,
        p_package_id: package_id,
        p_coin_amount: parseInt(coin_amount, 10),
        p_amount_cents: session.amount_total ?? 0,
        p_currency: session.currency ?? 'usd',
        p_customer_email: session.customer_email ?? null,
      });

      if (error) {
        console.error('fulfill_coin_purchase failed:', error.message);
        return new Response(`Database error: ${error.message}`, { status: 500 });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(String(error), { status: 500 });
  }
});
