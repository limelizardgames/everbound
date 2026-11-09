"use client";
import { sb, must } from "@/lib/supabase";
import type { QuestSession, QuestTemplate } from "@/lib/types";
import type { QuestCardData } from "@/components/QuestCard";

export type SessionWithSeats = QuestSession & { taken: number; waitlisted: number; seats_left: number; template?: QuestTemplate };

export async function upcomingSessions(opts: { templateId?: string; limit?: number } = {}): Promise<SessionWithSeats[]> {
  let q = sb().from("quest_sessions").select("*, template:quest_templates(*)").eq("status", "scheduled")
    .gt("starts_at", new Date().toISOString()).order("starts_at").limit(opts.limit ?? 50);
  if (opts.templateId) q = q.eq("template_id", opts.templateId);
  const list = (await must(q)) as unknown as (QuestSession & { template: QuestTemplate })[];
  if (!list.length) return [];
  const seats = await must(sb().from("session_seats").select("*").in("session_id", list.map((s) => s.id)));
  const map = new Map((seats ?? []).map((s: { session_id: string; taken: number; waitlisted: number }) => [s.session_id, s]));
  return list.map((s) => {
    const seat = map.get(s.id);
    const taken = seat?.taken ?? 0;
    return { ...s, taken, waitlisted: seat?.waitlisted ?? 0, seats_left: Math.max(0, s.capacity - taken) };
  });
}

export async function questBoard(): Promise<QuestCardData[]> {
  const [templates, sessions] = await Promise.all([
    must(sb().from("quest_templates").select("*").in("status", ["published", "locked"]).order("created_at")),
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

export async function myReservations(userId: string) {
  const data = await must(sb().from("reservations").select("session_id, status").eq("profile_id", userId).neq("status", "canceled"));
  return new Map((data ?? []).map((r: { session_id: string; status: string }) => [r.session_id, r.status]));
}
