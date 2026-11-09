// Supabase Edge Function: the ONLY place payments are confirmed, from a
// signature-verified Stripe event.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Stripe endpoint: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
import Stripe from "npm:stripe@17.6.0";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { httpClient: Stripe.createFetchHttpClient() });
const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) return new Response("not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret, undefined, crypto);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== "paid") return new Response(JSON.stringify({ received: true }));
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const amount = s.amount_total ?? 0;
    const { error } =
      s.metadata?.kind === "reservation" && s.metadata.reservation_id
        ? await admin.rpc("confirm_reservation_payment", { p_reservation: s.metadata.reservation_id, p_checkout_id: s.id, p_amount_cents: amount })
        : s.metadata?.kind === "order" && s.metadata.order_id
          ? await admin.rpc("confirm_order_payment", { p_order: s.metadata.order_id, p_checkout_id: s.id, p_amount_cents: amount })
          : { error: null };
    if (error) return new Response(error.message, { status: 500 }); // Stripe retries
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
