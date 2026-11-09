"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { errorMessage } from "@/lib/format";
import { isServiceRoleConfigured, isStripeConfigured } from "@/lib/env";
import { orderCheckoutUrl } from "@/lib/checkout";

export async function orderProduct(formData: FormData) {
  const viewer = await requireViewer("/store");
  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_items: [{ product_id: String(formData.get("product_id")), quantity: Number(formData.get("quantity") || 1) }],
    p_fulfillment: "pickup",
  });
  if (error) redirect(`/store?error=${encodeURIComponent(errorMessage(error))}`);
  if (!isStripeConfigured || !isServiceRoleConfigured) {
    redirect(`/portal/orders?ok=${encodeURIComponent("Order reserved. Pay at pickup — online payments are not enabled yet.")}`);
  }
  let url: string;
  try {
    url = await orderCheckoutUrl(orderId as string, viewer.userId, viewer.email);
  } catch (e) {
    redirect(`/store?error=${encodeURIComponent(errorMessage(e))}`);
  }
  redirect(url);
}

export async function buyWithGold(formData: FormData) {
  const viewer = await requireViewer("/store?tab=exchange");
  if (!viewer.character) redirect(`/portal/character/new`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buy_with_gold", {
    p_item: String(formData.get("item_id")), p_character: viewer.character!.id, p_quantity: Number(formData.get("quantity") || 1),
  });
  revalidatePath("/portal");
  redirect(`/store?tab=exchange&${error ? "error=" + encodeURIComponent(errorMessage(error)) : "ok=" + encodeURIComponent(`Purchased! You have ${data} gold left.`)}`);
}
