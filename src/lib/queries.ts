import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { QuestSession, QuestTemplate } from "@/lib/types";
import type { QuestCardData } from "@/components/QuestCard";

export type SessionWithSeats = QuestSession & { taken: number; waitlisted: number; seats_left: number; template?: QuestTemplate };

export async function upcomingSessions(opts: { templateId?: string; limit?: number } = {}): Promise<SessionWithSeats[]> {
  const supabase = await createClient();
  let q = supabase
    .from("quest_sessions")
    .select("*, template:quest_templates(*)")
    .eq("status", "scheduled")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(opts.limit ?? 50);
  if (opts.templateId) q = q.eq("template_id", opts.templateId);
  const { data: sessions } = await q;
  const list = (sessions ?? []) as (QuestSession & { template: QuestTemplate })[];
  if (!list.length) return [];
  const { data: seats } = await supabase.from("session_seats").select("*").in("session_id", list.map((s) => s.id));
  const map = new Map((seats ?? []).map((s: { session_id: string; taken: number; waitlisted: number }) => [s.session_id, s]));
  return list.map((s) => {
    const seat = map.get(s.id);
    const taken = seat?.taken ?? 0;
    return { ...s, taken, waitlisted: seat?.waitlisted ?? 0, seats_left: Math.max(0, s.capacity - taken) };
  });
}

export async function questBoard(): Promise<QuestCardData[]> {
  const supabase = await createClient();
  const [{ data: templates }, sessions] = await Promise.all([
    supabase.from("quest_templates").select("*").in("status", ["published", "locked"]).order("created_at"),
    upcomingSessions(),
  ]);
  return ((templates ?? []) as QuestTemplate[])
    .map((t) => {
      const mine = sessions.filter((s) => s.template_id === t.id);
      const open = mine.find((s) => s.seats_left > 0) ?? mine[0];
      return { ...t, next: open ? { starts_at: open.starts_at, price_cents: open.price_cents, seats_left: open.seats_left } : null };
    })
    .sort((a, b) => (a.status === "locked" ? 1 : 0) - (b.status === "locked" ? 1 : 0));
}

export async function guildStats() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_guild_stats");
  return (data ?? { adventurers: 0, open_quests: 0, world_events: 0, sessions_completed: 0 }) as {
    adventurers: number; open_quests: number; world_events: number; sessions_completed: number;
  };
}
