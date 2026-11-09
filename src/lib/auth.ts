import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { roleAtLeast, type Character, type CharacterTotals, type Profile, type Role } from "@/lib/types";

export type Viewer = {
  userId: string;
  email: string | null;
  profile: Profile;
  character: Character | null;
  totals: CharacterTotals | null;
  card: { id: string; card_number: string; token: string; tier: string; status: string } | null;
  unread: number;
};

/** The signed-in user with their profile and active character (one query batch per request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: character }, { data: card }, { count }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("characters").select("*").eq("profile_id", user.id).eq("is_active", true).maybeSingle(),
    supabase.from("guild_cards").select("id, card_number, token, tier, status").eq("profile_id", user.id).eq("status", "claimed").maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("profile_id", user.id).is("read_at", null),
  ]);
  if (!profile) return null;

  let totals: CharacterTotals | null = null;
  if (character) {
    const { data } = await supabase.from("character_totals").select("*").eq("character_id", character.id).single();
    totals = data as CharacterTotals | null;
  }
  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
    character: (character as Character) ?? null,
    totals,
    card: card ?? null,
    unread: count ?? 0,
  };
});

export async function requireViewer(next = "/portal"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/join?next=${encodeURIComponent(next)}`);
  return viewer;
}

export async function requireRole(min: Role, next = "/gm"): Promise<Viewer> {
  const viewer = await requireViewer(next);
  if (!roleAtLeast(viewer.profile.role, min)) redirect("/portal?error=" + encodeURIComponent("That area is for Guild staff only."));
  return viewer;
}

export function isStaff(viewer: Viewer | null) {
  return roleAtLeast(viewer?.profile.role, "game_master");
}
