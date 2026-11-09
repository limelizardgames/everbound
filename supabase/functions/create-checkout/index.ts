// Supabase Edge Function: creates a Stripe Checkout session for a pending
// reservation or store order belonging to the signed-in caller.
// Deploy: supabase functions deploy create-checkout
// Secrets: STRIPE_SECRET_KEY, SITE_URL (e.g. https://limelizardgames.github.io/everbound)
import Stripe from "npm:stripe@17.6.0";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { httpClient: Stripe.createFetchHttpClient() });
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

/** Only redirect back to our own site. */
function safeReturn(url: unknown, fallbackPath: string) {
  const u = typeof url === "string" ? url : "";
  return SITE_URL && u.startsWith(SITE_URL + "/") ? u : `${SITE_URL}${fallbackPath}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Identify the caller from their own access token.
  const authed = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return json({ error: "sign in required" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { kind, id, success_url, cancel_url } = await req.json().catch(() => ({}));

  if (kind === "reservation") {
    const { data: r } = await admin.from("reservations")
      .select("id, profile_id, status, amount_cents, hold_expires_at, session:quest_sessions(starts_at, currency, template:quest_templates(title))")
      .eq("id", id).single();
    if (!r || r.profile_id !== user.id) return json({ error: "not found" }, 404);
    if (r.status !== "pending_payment") return json({ error: "this reservation does not need payment" }, 400);
    if (r.hold_expires_at && new Date(r.hold_expires_at) < new Date()) return json({ error: "seat hold expired" }, 400);
    // deno-lint-ignore no-explicit-any
    const s = r.session as any;
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      line_items: [{ quantity: 1, price_data: { currency: s.currency, unit_amount: r.amount_cents, product_data: { name: `Quest admission: ${s.template.title}`, description: new Date(s.starts_at).toUTCString() } } }],
      metadata: { kind: "reservation", reservation_id: r.id },
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: safeReturn(success_url, "/portal/bookings/"),
      cancel_url: safeReturn(cancel_url, "/portal/bookings/"),
    });
    await admin.from("reservations").update({ stripe_checkout_id: checkout.id }).eq("id", r.id);
    return json({ url: checkout.url });
  }

  if (kind === "order") {
    const { data: o } = await admin.from("orders")
      .select("id, profile_id, status, items:order_items(quantity, unit_price_cents, product:products(name))").eq("id", id).single();
    if (!o || o.profile_id !== user.id || o.status !== "pending") return json({ error: "not found" }, 404);
    // deno-lint-ignore no-explicit-any
    const items = o.items as any[];
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      line_items: items.map((i) => ({ quantity: i.quantity, price_data: { currency: "usd", unit_amount: i.unit_price_cents, product_data: { name: i.product.name } } })),
      automatic_tax: { enabled: Deno.env.get("STRIPE_AUTOMATIC_TAX") === "true" },
      metadata: { kind: "order", order_id: o.id },
      success_url: safeReturn(success_url, "/portal/orders/"),
      cancel_url: safeReturn(cancel_url, "/store/"),
    });
    await admin.from("orders").update({ stripe_checkout_id: checkout.id }).eq("id", o.id);
    return json({ url: checkout.url });
  }

  return json({ error: "unknown kind" }, 400);
});
