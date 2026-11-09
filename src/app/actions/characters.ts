"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { errorMessage } from "@/lib/format";

export async function createCharacter(formData: FormData) {
  await requireViewer("/portal/character/new");
  const supabase = await createClient();
  const { data: rs } = await supabase.from("rule_sets").select("definition").eq("is_active", true).single();
  const attrs: Record<string, number> = {};
  for (const a of (rs?.definition?.attributes ?? []) as { key: string }[]) attrs[a.key] = Number(formData.get(`attr_${a.key}`) ?? 0);
  const { error } = await supabase.rpc("create_character", {
    p_name: String(formData.get("name") ?? ""),
    p_species: String(formData.get("species") ?? ""),
    p_class: String(formData.get("class") ?? ""),
    p_pronouns: String(formData.get("pronouns") ?? ""),
    p_backstory: String(formData.get("backstory") ?? ""),
    p_attributes: attrs,
    p_is_public: formData.get("is_public") === "on",
  });
  if (error) redirect(`/portal/character/new?error=${encodeURIComponent(errorMessage(error))}`);
  revalidatePath("/portal");
  redirect(`/portal?ok=${encodeURIComponent("Welcome to the Guild, adventurer. Your legend begins here.")}`);
}

export async function updateCharacter(formData: FormData) {
  const viewer = await requireViewer("/portal/character");
  if (!viewer.character) redirect("/portal/character/new");
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    name: String(formData.get("name") ?? "").trim(),
    pronouns: String(formData.get("pronouns") ?? "").trim() || null,
    backstory: String(formData.get("backstory") ?? "").trim() || null,
    is_public: formData.get("is_public") === "on",
  };

  const file = formData.get("portrait");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) redirect(`/portal/character?error=${encodeURIComponent("Portrait must be under 2 MB.")}`);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) redirect(`/portal/character?error=${encodeURIComponent("Use a PNG, JPEG or WebP image.")}`);
    const ext = file.type.split("/")[1];
    const path = `${viewer.userId}/${viewer.character!.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("portraits").upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) redirect(`/portal/character?error=${encodeURIComponent("Upload failed: " + upErr.message)}`);
    patch.portrait_url = supabase.storage.from("portraits").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("characters").update(patch).eq("id", viewer.character!.id);
  revalidatePath("/portal");
  redirect(`/portal/character?${error ? "error=" + encodeURIComponent(errorMessage(error)) : "ok=" + encodeURIComponent("Character sheet updated.")}`);
}

export async function updateSettings(formData: FormData) {
  const viewer = await requireViewer("/portal/settings");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({
    display_name: String(formData.get("display_name") ?? "").trim(),
    show_on_leaderboards: formData.get("show_on_leaderboards") === "on",
  }).eq("id", viewer.userId);
  revalidatePath("/portal");
  redirect(`/portal/settings?${error ? "error=" + encodeURIComponent(errorMessage(error)) : "ok=" + encodeURIComponent("Settings saved.")}`);
}

export async function markAllRead() {
  const viewer = await requireViewer("/portal/notifications");
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", viewer.userId).is("read_at", null);
  revalidatePath("/portal");
  redirect("/portal/notifications");
}

export async function claimByCode(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/portal/card?error=" + encodeURIComponent("Enter the code printed under your QR."));
  redirect(`/card/${encodeURIComponent(code)}`);
}
