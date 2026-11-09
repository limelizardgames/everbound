import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Flash, PageHeader, Stat, StatusPill, type SP } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/types";

export const metadata = { title: "Command Center" };

export default async function CommandCenter({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireRole("game_master");
  const supabase = await createClient();
  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 86400000).toISOString();
  const [{ data: sessions }, { data: pending }, { count: reports }, { count: conflicts }, { data: stats }, { count: unclaimed }] = await Promise.all([
    supabase.from("quest_sessions").select("id, starts_at, table_label, capacity, status, gm_id, template:quest_templates(title)").in("status", ["scheduled", "in_progress"]).lte("starts_at", soon).order("starts_at").limit(12),
    supabase.from("session_results").select("session_id, submitted_at, session:quest_sessions(starts_at, template:quest_templates(title))").eq("status", "submitted"),
    supabase.from("message_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("world_events").select("id", { count: "exact", head: true }).eq("status", "conflict"),
    supabase.rpc("get_guild_stats"),
    supabase.from("guild_cards").select("id", { count: "exact", head: true }).eq("status", "unassigned"),
  ]);
  const ids = (sessions ?? []).map((s) => s.id);
  const { data: seats } = ids.length ? await supabase.from("session_seats").select("*").in("session_id", ids) : { data: [] };
  const seatMap = new Map((seats ?? []).map((s) => [s.session_id, s]));
  type S = { id: string; starts_at: string; table_label: string | null; capacity: number; status: string; gm_id: string | null; template: { title: string } };
  type P = { session_id: string; submitted_at: string; session: { starts_at: string; template: { title: string } } };
  const st = stats as { adventurers: number; open_quests: number; sessions_completed: number } | null;

  return (
    <div>
      <PageHeader eyebrow={`${ROLE_LABEL[viewer.profile.role]} · ${viewer.profile.display_name}`} title="Command Center"
        action={<Link href="/gm/sessions" className="btn-gold">Schedule a session</Link>} />
      <Flash ok={q.ok} error={q.error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Adventurers" value={st?.adventurers ?? 0} />
        <Stat label="Open sessions" value={st?.open_quests ?? 0} tone="arcane" />
        <Stat label="Completed" value={st?.sessions_completed ?? 0} />
        <Stat label="Unclaimed cards" value={unclaimed ?? 0} tone="arcane" />
      </div>

      {((pending ?? []).length > 0 || (reports ?? 0) > 0 || (conflicts ?? 0) > 0) && (
        <section className="panel-arcane mt-6">
          <h2 className="eyebrow">Needs attention</h2>
          <ul className="mt-2 grid gap-2 text-sm">
            {((pending ?? []) as unknown as P[]).map((p) => (
              <li key={p.session_id}><Link className="link" href={`/gm/sessions/${p.session_id}#results`}>Approve results: {p.session.template.title} ({dateTime(p.session.starts_at)})</Link></li>
            ))}
            {(reports ?? 0) > 0 && <li><Link className="link" href="/gm/players#reports">{reports} open chat report(s)</Link></li>}
            {(conflicts ?? 0) > 0 && <li><Link className="link" href="/gm/world">{conflicts} world-state conflict(s) to review</Link></li>}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="heading text-xl">Next two weeks</h2>
        <ul className="mt-3 grid gap-2">
          {((sessions ?? []) as unknown as S[]).map((s) => {
            const taken = seatMap.get(s.id)?.taken ?? 0;
            return (
              <li key={s.id}>
                <Link href={`/gm/sessions/${s.id}`} className="panel flex flex-wrap items-center justify-between gap-2 hover:border-gold/60">
                  <span>
                    <span className="font-display text-lg text-gold-light">{s.template.title}</span>
                    <span className="muted block text-sm">{dateTime(s.starts_at)}{s.table_label ? ` · ${s.table_label}` : ""}{s.gm_id === viewer.userId ? " · You are GM" : ""}</span>
                  </span>
                  <span className="flex items-center gap-2 text-sm"><span>{taken}/{s.capacity} seated</span><StatusPill status={s.status === "scheduled" ? "open" : s.status} /></span>
                </Link>
              </li>
            );
          })}
          {(sessions ?? []).length === 0 && <li className="muted">Nothing scheduled.</li>}
        </ul>
      </section>
    </div>
  );
}
