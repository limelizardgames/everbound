"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/format";

export async function claimCard(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_guild_card", { p_token: token });
  if (error) redirect(`/card/${encodeURIComponent(token)}?error=${encodeURIComponent(errorMessage(error))}`);
  const { data: char } = await supabase.from("characters").select("id").eq("is_active", true).maybeSingle();
  revalidatePath("/portal");
  if (!char) redirect(`/portal/character/new?ok=${encodeURIComponent(`Guild card ${data} is now bound to your account. Register your adventurer!`)}`);
  redirect(`/portal/card?ok=${encodeURIComponent(`Guild card ${data} is now bound to your account.`)}`);
}

function gmBack(msg: { ok?: string; error?: string }, path = "/gm/cards") {
  const q = msg.error ? `error=${encodeURIComponent(msg.error)}` : `ok=${encodeURIComponent(msg.ok ?? "Done")}`;
  redirect(`${path}?${q}`);
}

export async function generateCards(formData: FormData) {
  const count = Number(formData.get("count") ?? 0);
  const batch = String(formData.get("batch") ?? "").trim() || `batch-${new Date().toISOString().slice(0, 10)}`;
  const tier = String(formData.get("tier") ?? "standard");
  const names = String(formData.get("names") ?? "").split("\n").map((n) => n.trim()).filter(Boolean);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_guild_cards", {
    p_count: names.length || count, p_batch: batch, p_tier: tier, p_names: names.length ? names : null,
  });
  if (error) gmBack({ error: errorMessage(error) });
  revalidatePath("/gm/cards");
  gmBack({ ok: `Forged ${data?.length ?? 0} cards in batch "${batch}". Print them below.` }, `/gm/cards?batch=${encodeURIComponent(batch)}`);
}

export async function assignCard(formData: FormData) {
  const supabase = await createClient();
  const cardNumber = String(formData.get("card_number") ?? "").trim().toUpperCase();
  const profileId = String(formData.get("profile_id") ?? "");
  const { data: card } = await supabase.from("guild_cards").select("id").eq("card_number", cardNumber).maybeSingle();
  if (!card) gmBack({ error: `No card ${cardNumber}` });
  const { error } = await supabase.rpc("assign_guild_card", { p_card: card!.id, p_profile: profileId });
  if (error) gmBack({ error: errorMessage(error) });
  revalidatePath("/gm/cards");
  gmBack({ ok: `${cardNumber} assigned.` });
}

export async function deactivateCard(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("deactivate_guild_card", { p_card: String(formData.get("card_id")), p_reason: String(formData.get("reason") || "Retired by staff") });
  if (error) gmBack({ error: errorMessage(error) });
  revalidatePath("/gm/cards");
  gmBack({ ok: "Card deactivated." });
}

export async function replaceCard(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("replace_guild_card", {
    p_card: String(formData.get("card_id")),
    p_reason: String(formData.get("reason") || "Lost card"),
    p_tier: String(formData.get("tier") || "") || null,
  });
  if (error) gmBack({ error: errorMessage(error) });
  revalidatePath("/gm/cards");
  gmBack({ ok: `Replacement ${data?.card_number} issued. Print it from the replacement batch.` }, `/gm/cards?batch=replacement`);
}
