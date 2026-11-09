import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { scheduleSession } from "@/app/actions/gm";
import { Flash, PageHeader, StatusPill, sp, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { dateTime, money } from "@/lib/format";
import { TIMEZONE } from "@/lib/env";

export const metadata = { title: "Session Manager" };

export default async function Sessions({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireRole("game_master");
  const show = sp(q.show) === "past" ? "past" : "upcoming";
  const supabase = await createClient();
  const now = new Date().toISOString();
  let query = supabase.from("quest_sessions").select("id, starts_at, venue, table_label, capacity, price_cents, status, gm_id, template:quest_templates(title)").limit(60);
  query = show === "past" ? query.lt("starts_at", now).order("starts_at", { ascending: false }) : query.gte("starts_at", now).order("starts_at");
  const [{ data: sessions }, { data: templates }, { data: staff }, { data: venue }] = await Promise.all([
    query,
    supabase.from("quest_templates").select("id, title, status").in("status", ["published", "draft"]).order("title"),
    supabase.from("profiles").select("id, display_name, role").neq("role", "adventurer").order("display_name"),
    supabase.from("admin_settings").select("value").eq("key", "default_venue").maybeSingle(),
  ]);
  const staffName = new Map((staff ?? []).map((s) => [s.id, s.display_name]));
  type S = { id: string; starts_at: string; venue: string; table_label: string | null; capacity: number; price_cents: number; status: string; gm_id: string | null; template: { title: string } };
  return (
    <div>
      <PageHeader eyebrow="Scheduled adventures" title="Session Manager" />
      <Flash ok={q.ok} error={q.error} />
      <details className="panel mb-8" open={(sessions ?? []).length === 0}>
        <summary className="cursor-pointer font-display text-lg text-gold-light">+ Schedule a session</summary>
        <form action={scheduleSession} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3"><label className="label" htmlFor="template_id">Quest</label>
            <select className="input" id="template_id" name="template_id" required>{(templates ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}{t.status === "draft" ? " (draft — not bookable)" : ""}</option>)}</select></div>
          <div><label className="label" htmlFor="starts_at">Start ({TIMEZONE})</label><input className="input" type="datetime-local" id="starts_at" name="starts_at" required /></div>
          <div><label className="label" htmlFor="hours">Length (hours)</label><input className="input" type="number" id="hours" name="hours" min={1} max={8} step={0.5} defaultValue={3} /></div>
          <div><label className="label" htmlFor="capacity">Seats</label><input className="input" type="number" id="capacity" name="capacity" min={1} max={20} defaultValue={5} /></div>
          <div><label className="label" htmlFor="venue">Venue</label><input className="input" id="venue" name="venue" defaultValue={(venue?.value as string) ?? "Partner Game Store"} /></div>
          <div><label className="label" htmlFor="table_label">Table</label><input className="input" id="table_label" name="table_label" placeholder="Table 1" /></div>
          <div><label className="label" htmlFor="price">Admission ($)</label><input className="input" type="number" id="price" name="price" min={0} step={0.5} defaultValue={20} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="gm_id">Game Master</label>
            <select className="input" id="gm_id" name="gm_id" defaultValue={viewer.userId}>{(staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}</select></div>
          <div className="flex items-end"><SubmitButton className="btn-gold w-full">Schedule</SubmitButton></div>
        </form>
      </details>
      <div className="mb-4 flex gap-2">
        <Link href="/gm/sessions" className={`btn-sm ${show === "upcoming" ? "btn-gold" : "btn-ghost"}`}>Upcoming</Link>
        <Link href="/gm/sessions?show=past" className={`btn-sm ${show === "past" ? "btn-gold" : "btn-ghost"}`}>Past</Link>
      </div>
      <div className="panel overflow-x-auto p-0">
        <table className="table-eb">
          <thead><tr><th>When</th><th>Quest</th><th>Table</th><th>GM</th><th>Price</th><th>Status</th></tr></thead>
          <tbody>
            {((sessions ?? []) as unknown as S[]).map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap"><Link className="link" href={`/gm/sessions/${s.id}`}>{dateTime(s.starts_at)}</Link></td>
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
