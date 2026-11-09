import "server-only";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";

/** Creates a Stripe Checkout session for a pending reservation owned by `userId`. */
export async function reservationCheckoutUrl(reservationId: string, userId: string, email: string | null) {
  const admin = createAdminClient();
  const { data: res } = await admin
    .from("reservations")
    .select("id, profile_id, status, amount_cents, hold_expires_at, session:quest_sessions(starts_at, currency, template:quest_templates(title))")
    .eq("id", reservationId)
    .single();
  if (!res || res.profile_id !== userId) throw new Error("Reservation not found");
  if (res.status !== "pending_payment") throw new Error("This reservation does not need payment");
  if (res.hold_expires_at && new Date(res.hold_expires_at) < new Date()) throw new Error("Your seat hold expired. Please book again.");
  const session = res.session as unknown as { starts_at: string; currency: string; template: { title: string } };

  const checkout = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email ?? undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: session.currency,
        unit_amount: res.amount_cents,
        product_data: { name: `Quest admission: ${session.template.title}`, description: new Date(session.starts_at).toUTCString() },
      },
    }],
    metadata: { kind: "reservation", reservation_id: res.id },
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    success_url: `${siteUrl()}/portal/bookings?ok=${encodeURIComponent("Payment received — your seat is being confirmed.")}`,
    cancel_url: `${siteUrl()}/portal/bookings?error=${encodeURIComponent("Payment was not completed. Your hold lasts 30 minutes.")}`,
  });
  await admin.from("reservations").update({ stripe_checkout_id: checkout.id }).eq("id", res.id);
  return checkout.url!;
}

export async function orderCheckoutUrl(orderId: string, userId: string, email: string | null) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, profile_id, status, total_cents, items:order_items(quantity, unit_price_cents, product:products(name))")
    .eq("id", orderId)
    .single();
  if (!order || order.profile_id !== userId || order.status !== "pending") throw new Error("Order not found");
  const items = order.items as unknown as { quantity: number; unit_price_cents: number; product: { name: string } }[];
  const checkout = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email ?? undefined,
    line_items: items.map((i) => ({
      quantity: i.quantity,
      price_data: { currency: "usd", unit_amount: i.unit_price_cents, product_data: { name: i.product.name } },
    })),
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    metadata: { kind: "order", order_id: order.id },
    success_url: `${siteUrl()}/portal/orders?ok=${encodeURIComponent("Thank you! Your order is being prepared.")}`,
    cancel_url: `${siteUrl()}/store?error=${encodeURIComponent("Checkout canceled.")}`,
  });
  await admin.from("orders").update({ stripe_checkout_id: checkout.id }).eq("id", order.id);
  return checkout.url!;
}
