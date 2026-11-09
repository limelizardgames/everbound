"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { errorMessage } from "@/lib/format";
import { isServiceRoleConfigured, isStripeConfigured } from "@/lib/env";
import { reservationCheckoutUrl } from "@/lib/checkout";

export async function reserveSeat(formData: FormData) {
  const sessionId = String(formData.get("session_id"));
  const back = String(formData.get("back") || "/quests");
  const viewer = await requireViewer(back);
  if (!viewer.character) redirect(`/portal/character/new?error=${encodeURIComponent("Register your adventurer before accepting a quest.")}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_seat", { p_session: sessionId, p_character: viewer.character!.id });
  if (error) redirect(`${back}?error=${encodeURIComponent(errorMessage(error))}`);
  revalidatePath("/portal");
  const result = data as { reservation_id: string; status: string };

  if (result.status === "pending_payment") {
    if (!isStripeConfigured || !isServiceRoleConfigured) {
      redirect(`/portal/bookings?error=${encodeURIComponent("Seat held, but online payment is not configured yet. Ask a Guild Master.")}`);
    }
    let url: string;
    try {
      url = await reservationCheckoutUrl(result.reservation_id, viewer.userId, viewer.email);
    } catch (e) {
      redirect(`/portal/bookings?error=${encodeURIComponent(errorMessage(e))}`);
    }
    redirect(url);
  }
  const msg = result.status === "waitlisted" ? "The table is full — you are on the waitlist." : "Quest accepted! Your seat is confirmed.";
  redirect(`/portal/bookings?ok=${encodeURIComponent(msg)}`);
}

export async function payReservation(formData: FormData) {
  const viewer = await requireViewer("/portal/bookings");
  let url: string;
  try {
    url = await reservationCheckoutUrl(String(formData.get("reservation_id")), viewer.userId, viewer.email);
  } catch (e) {
    redirect(`/portal/bookings?error=${encodeURIComponent(errorMessage(e))}`);
  }
  redirect(url);
}

export async function cancelReservation(formData: FormData) {
  const back = String(formData.get("back") || "/portal/bookings");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_reservation", { p_reservation: String(formData.get("reservation_id")) });
  revalidatePath(back);
  redirect(`${back}?${error ? "error=" + encodeURIComponent(errorMessage(error)) : "ok=" + encodeURIComponent("Reservation canceled.")}`);
}
