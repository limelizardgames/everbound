import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Payments are only ever confirmed here, from a signature-verified Stripe event. */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== "paid") return NextResponse.json({ received: true });
    const admin = createAdminClient();
    const amount = s.amount_total ?? 0;
    if (s.metadata?.kind === "reservation" && s.metadata.reservation_id) {
      const { error } = await admin.rpc("confirm_reservation_payment", { p_reservation: s.metadata.reservation_id, p_checkout_id: s.id, p_amount_cents: amount });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (s.metadata?.kind === "order" && s.metadata.order_id) {
      const { error } = await admin.rpc("confirm_order_payment", { p_order: s.metadata.order_id, p_checkout_id: s.id, p_amount_cents: amount });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
