"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { sb } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/env";
import { roleAtLeast, type Character, type CharacterTotals, type Profile } from "@/lib/types";

export type Viewer = {
  userId: string;
  email: string | null;
  profile: Profile;
  character: Character | null;
  totals: CharacterTotals | null;
  card: { id: string; card_number: string; token: string; tier: string; status: string } | null;
  unread: number;
};

type Ctx = { viewer: Viewer | null; loading: boolean; refresh: () => Promise<void> };
const ViewerContext = createContext<Ctx>({ viewer: null, loading: true, refresh: async () => {} });

async function loadViewer(): Promise<Viewer | null> {
  const supabase = sb();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
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
    totals = (data as CharacterTotals) ?? null;
  }
  return { userId: user.id, email: user.email ?? null, profile: profile as Profile, character: (character as Character) ?? null, totals, card: card ?? null, unread: count ?? 0 };
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      setViewer(await loadViewer());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    refresh();
    const { data } = sb().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(refresh, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  return <ViewerContext.Provider value={{ viewer, loading, refresh }}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  return useContext(ViewerContext);
}

export function isStaff(v: Viewer | null) {
  return roleAtLeast(v?.profile.role, "game_master");
}
