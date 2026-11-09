"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { scheduleSession } from "@/lib/actions";
import { PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { dateTime, money } from "@/lib/format";
import { TIMEZONE } from "@/lib/env";

type S = { id: string; starts_at: string; venue: string; table_label: string | null; capacity: number; price_cents: number; status: string; gm_id: string | null; template: { title: string } };

export default function Page() {
  return <Suspense fallback={<Loading />}><Sessions /></Suspense>;
}

function Sessions() {
  useTitle("Session Manager");
  const show = useSearchParams().get("show") === "past" ? "past" : "upcoming";
  const { viewer } = useViewer();
  const act = useAct();
  const { data } = useData(async () => {
    const now = new Date().toISOString();
    let q = sb().from("quest_sessions").select("id, starts_at, venue, table_label, capacity, price_cents, status, gm_id, template:quest_templates(title)").limit(60);
    q = show === "past" ? q.lt("starts_at", now).order("starts_at", { ascending: false }) : q.gte("starts_at", now).order("starts_at");
    const [sessions, templates, staff, venue] = await Promise.all([
      must(q),
      must(sb().from("quest_templates").select("id, title, status").in("status", ["published", "draft"]).order("title")),
      must(sb().from("profiles").select("id, display_name").neq("role", "adventurer").order("display_name")),
      must(sb().from("admin_settings").select("value").eq("key", "default_venue").maybeSingle()),
    ]);
    return { sessions: sessions as unknown as S[], templates: templates as { id: string; title: string; status: string }[], staff: staff as { id: string; display_name: string }[], venue: (venue?.value as string) ?? "Partner Game Store" };
  }, [show]);
  if (!data || !viewer) return <Loading />;
  const staffName = new Map(data.staff.map((s) => [s.id, s.display_name]));
  return (
    <div>
      <PageHeader eyebrow="Scheduled adventures" title="Session Manager" />
      <details className="panel mb-8" open={data.sessions.length === 0}>
        <summary className="cursor-pointer font-display text-lg text-gold-light">+ Schedule a session</summary>
        <form action={act(scheduleSession)} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3"><label className="label" htmlFor="template_id">Quest</label>
            <select className="input" id="template_id" name="template_id" required>{data.templates.map((t) => <option key={t.id} value={t.id}>{t.title}{t.status === "draft" ? " (draft — not bookable)" : ""}</option>)}</select></div>
          <div><label className="label" htmlFor="starts_at">Start ({TIMEZONE})</label><input className="input" type="datetime-local" id="starts_at" name="starts_at" required /></div>
          <div><label className="label" htmlFor="hours">Length (hours)</label><input className="input" type="number" id="hours" name="hours" min={1} max={8} step={0.5} defaultValue={3} /></div>
          <div><label className="label" htmlFor="capacity">Seats</label><input className="input" type="number" id="capacity" name="capacity" min={1} max={20} defaultValue={5} /></div>
          <div><label className="label" htmlFor="venue">Venue</label><input className="input" id="venue" name="venue" defaultValue={data.venue} /></div>
          <div><label className="label" htmlFor="table_label">Table</label><input className="input" id="table_label" name="table_label" placeholder="Table 1" /></div>
          <div><label className="label" htmlFor="price">Admission ($)</label><input className="input" type="number" id="price" name="price" min={0} step={0.5} defaultValue={20} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="gm_id">Game Master</label>
            <select className="input" id="gm_id" name="gm_id" defaultValue={viewer.userId}>{data.staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}</select></div>
          <div className="flex items-end"><SubmitButton className="btn-gold w-full">Schedule</SubmitButton></div>
        </form>
      </details>
      <div className="mb-4 flex gap-2">
        <Link href="/gm/sessions/" className={`btn-sm ${show === "upcoming" ? "btn-gold" : "btn-ghost"}`}>Upcoming</Link>
        <Link href="/gm/sessions/?show=past" className={`btn-sm ${show === "past" ? "btn-gold" : "btn-ghost"}`}>Past</Link>
      </div>
      <div className="panel overflow-x-auto p-0">
        <table className="table-eb">
          <thead><tr><th>When</th><th>Quest</th><th>Table</th><th>GM</th><th>Price</th><th>Status</th></tr></thead>
          <tbody>
            {data.sessions.map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap"><Link className="link" href={`/gm/session/?id=${s.id}`}>{dateTime(s.starts_at)}</Link></td>
                <td>{s.template.title}</td><td>{s.table_label ?? "—"} · {s.capacity} seats</td><td>{s.gm_id ? staffName.get(s.gm_id) ?? "—" : "Unassigned"}</td>
                <td>{money(s.price_cents)}</td><td><StatusPill status={s.status === "scheduled" ? "open" : s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
