"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { PageHeader, Stat, StatusPill } from "@/components/ui";
import { Loading, useTitle } from "@/components/Guard";
import { dateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/types";

type S = { id: string; starts_at: string; table_label: string | null; capacity: number; status: string; gm_id: string | null; template: { title: string } };
type P = { session_id: string; session: { starts_at: string; template: { title: string } } };

export default function CommandCenter() {
  useTitle("Command Center");
  const { viewer } = useViewer();
  const { data } = useData(async () => {
    const soon = new Date(Date.now() + 14 * 86400000).toISOString();
    const c = sb();
    const [sessions, pending, reports, conflicts, stats, unclaimed] = await Promise.all([
      must(c.from("quest_sessions").select("id, starts_at, table_label, capacity, status, gm_id, template:quest_templates(title)").in("status", ["scheduled", "in_progress"]).lte("starts_at", soon).order("starts_at").limit(12)),
      must(c.from("session_results").select("session_id, session:quest_sessions(starts_at, template:quest_templates(title))").eq("status", "submitted")),
      c.from("message_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      c.from("world_events").select("id", { count: "exact", head: true }).eq("status", "conflict"),
      must(c.rpc("get_guild_stats")),
      c.from("guild_cards").select("id", { count: "exact", head: true }).eq("status", "unassigned"),
    ]);
    const list = sessions as unknown as S[];
    const seats = list.length ? await must(c.from("session_seats").select("*").in("session_id", list.map((s) => s.id))) : [];
    return {
      sessions: list, pending: pending as unknown as P[], reports: reports.count ?? 0, conflicts: conflicts.count ?? 0, unclaimed: unclaimed.count ?? 0,
      stats: stats as { adventurers: number; open_quests: number; sessions_completed: number },
      seats: new Map((seats as { session_id: string; taken: number }[]).map((s) => [s.session_id, s.taken])),
    };
  }, []);
  if (!viewer || !data) return <Loading />;
  return (
    <div>
      <PageHeader eyebrow={`${ROLE_LABEL[viewer.profile.role]} · ${viewer.profile.display_name}`} title="Command Center" action={<Link href="/gm/sessions/" className="btn-gold">Schedule a session</Link>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Adventurers" value={data.stats.adventurers} />
        <Stat label="Open sessions" value={data.stats.open_quests} tone="arcane" />
        <Stat label="Completed" value={data.stats.sessions_completed} />
        <Stat label="Unclaimed cards" value={data.unclaimed} tone="arcane" />
      </div>
      {(data.pending.length > 0 || data.reports > 0 || data.conflicts > 0) && (
        <section className="panel-arcane mt-6">
          <h2 className="eyebrow">Needs attention</h2>
          <ul className="mt-2 grid gap-2 text-sm">
            {data.pending.map((p) => <li key={p.session_id}><Link className="link" href={`/gm/session/?id=${p.session_id}#results`}>Approve results: {p.session.template.title} ({dateTime(p.session.starts_at)})</Link></li>)}
            {data.reports > 0 && <li><Link className="link" href="/gm/players/#reports">{data.reports} open chat report(s)</Link></li>}
            {data.conflicts > 0 && <li><Link className="link" href="/gm/world/">{data.conflicts} world-state conflict(s) to review</Link></li>}
          </ul>
        </section>
      )}
      <section className="mt-6">
        <h2 className="heading text-xl">Next two weeks</h2>
        <ul className="mt-3 grid gap-2">
          {data.sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/gm/session/?id=${s.id}`} className="panel flex flex-wrap items-center justify-between gap-2 hover:border-gold/60">
                <span>
                  <span className="font-display text-lg text-gold-light">{s.template.title}</span>
                  <span className="muted block text-sm">{dateTime(s.starts_at)}{s.table_label ? ` · ${s.table_label}` : ""}{s.gm_id === viewer.userId ? " · You are GM" : ""}</span>
                </span>
                <span className="flex items-center gap-2 text-sm"><span>{data.seats.get(s.id) ?? 0}/{s.capacity} seated</span><StatusPill status={s.status === "scheduled" ? "open" : s.status} /></span>
              </Link>
            </li>
          ))}
          {data.sessions.length === 0 && <li className="muted">Nothing scheduled.</li>}
        </ul>
      </section>
    </div>
  );
}
