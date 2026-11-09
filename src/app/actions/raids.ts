"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { errorMessage, zonedToUtc } from "@/lib/format";

export async function registerForRaid(formData: FormData) {
  const viewer = await requireViewer("/raids");
  if (!viewer.character) redirect("/portal/character/new");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_raid", {
    p_raid: String(formData.get("raid_id")), p_character: viewer.character!.id, p_window: String(formData.get("window") || "") || null,
  });
  revalidatePath("/raids");
  redirect(`/raids?${error ? "error=" + encodeURIComponent(errorMessage(error)) : "ok=" + encodeURIComponent(data === "waitlisted" ? "The raid is full — you are on the waitlist." : "You have answered the call!")}`);
}

export async function setRaidState(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_raid_state", {
    p_raid: String(formData.get("raid_id")), p_state: String(formData.get("state")), p_override: formData.get("override") === "on",
  });
  revalidatePath("/gm/raids");
  revalidatePath("/raids");
  redirect(`/gm/raids?${error ? "error=" + encodeURIComponent(errorMessage(error)) : "ok=" + encodeURIComponent("Raid state updated.")}`);
}

export async function toggleRaidPause(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_raid_paused", { p_raid: String(formData.get("raid_id")), p_paused: formData.get("paused") === "true" });
  revalidatePath("/gm/raids");
  redirect(`/gm/raids?${error ? "error=" + encodeURIComponent(errorMessage(error)) : "ok=" + encodeURIComponent("Raid updated.")}`);
}

export async function updateRaid(formData: FormData) {
  const supabase = await createClient();
  const toIso = (v: FormDataEntryValue | null) => (v ? zonedToUtc(String(v)).toISOString() : null);
  const { error } = await supabase.from("raids").update({
    foreshadow_text: String(formData.get("foreshadow_text") || "") || null,
    reveal_text: String(formData.get("reveal_text") || "") || null,
    capacity: Number(formData.get("capacity")) || null,
    min_rank: String(formData.get("min_rank") || "") || null,
    starts_at: toIso(formData.get("starts_at")),
    conditions_public: formData.get("conditions_public") === "on",
    updated_at: new Date().toISOString(),
  }).eq("id", String(formData.get("raid_id")));
  revalidatePath("/gm/raids");
  redirect(`/gm/raids?${error ? "error=" + encodeURIComponent(errorMessage(error)) : "ok=" + encodeURIComponent("Raid details saved.")}`);
}
