"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import {
  approveResults, cancelReservation, gmUseItem, rejectResults, saveResults, saveSessionNotes, setPaymentStatus, updateLiveState, updateSession,
} from "@/lib/actions";
import { Empty, PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { CHRONICLE_LABEL, LOCATION_STATUSES, dateTime, money } from "@/lib/format";
import { roleAtLeast } from "@/lib/types";

type Reward = { character_id: string; attended?: boolean; xp?: number; gold?: number; renown?: number; items?: { item_id: string }[]; achievements?: string[]; note?: string };
type Opt = { id: string; name: string };
type R = { id: string; status: string; payment_status: string; amount_cents: number; live_hp: number | null; live_conditions: string | null; profile_id: string; character: { id: string; name: string; species: string; class: string; hp_current: number; hp_max: number; conditions: string | null; profile_id: string } };

async function loadSession(id: string) {
  const c = sb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = (await must(c.from("quest_sessions").select("*, template:quest_templates(id, title, slug, reward_preview)").eq("id", id).maybeSingle())) as any;
  if (!session) return null;
  const [roster, notes, results, secrets, items, achievements, flags, locations, staff] = await Promise.all([
    must(c.from("reservations").select("id, status, payment_status, amount_cents, live_hp, live_conditions, created_at, profile_id, character:characters(id, name, species, class, hp_current, hp_max, conditions, profile_id)").eq("session_id", id).order("created_at")),
    must(c.from("quest_session_notes").select("notes").eq("session_id", id).maybeSingle()),
    must(c.from("session_results").select("*").eq("session_id", id).maybeSingle()),
    must(c.from("quest_template_secrets").select("*").eq("template_id", session.template.id).maybeSingle()),
    must(c.from("items").select("id, name").order("name")),
    must(c.from("achievements").select("id, name").order("name")),
    must(c.from("world_flags").select("key, label, value").order("label")),
    must(c.from("locations").select("id, name, status, is_discovered").order("name")),
    must(c.from("profiles").select("id, display_name").neq("role", "adventurer").order("display_name")),
  ]);
  const all = roster as unknown as R[];
  const charIds = all.map((r) => r.character.id);
  const totals = charIds.length ? await must(c.from("character_totals").select("character_id, level, rank_code").in("character_id", charIds)) : [];
  const packs = charIds.length ? await must(c.from("inventory_balances").select("character_id, quantity, item:items(id, name, rarity, item_type)").in("character_id", charIds)) : [];
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session, all, notes: notes as { notes: string | null } | null, results: results as any, secrets: secrets as any,
    items: items as Opt[], achievements: achievements as Opt[], flags: flags as { key: string; label: string; value: number }[],
    locations: locations as { id: string; name: string; status: string; is_discovered: boolean }[], staff: staff as { id: string; display_name: string }[],
    tmap: new Map((totals as { character_id: string; level: number; rank_code: string }[]).map((t) => [t.character_id, t])),
    packs: packs as unknown as { character_id: string; quantity: number; item: { id: string; name: string; rarity: string; item_type: string } }[],
  };
}

export default function Page() {
  return <Suspense fallback={<Loading />}><SessionDetail /></Suspense>;
}

function SessionDetail() {
  const id = useSearchParams().get("id") ?? "";
  const { viewer } = useViewer();
  const act = useAct();
  const { data, loading, reload } = useData(() => loadSession(id), [id]);
  useTitle(data?.session.template.title ?? "Run Session");
  if (loading || !viewer) return <Loading />;
  if (!data) return <Empty title="Session not found" action={<Link className="btn-ghost" href="/gm/sessions/">Session Manager</Link>} />;
  const { session, all, notes, results, secrets, items, achievements, flags, locations, staff, tmap, packs } = data;
  const after = { after: reload };
  const seated = all.filter((r) => ["confirmed", "pending_payment", "attended", "no_show"].includes(r.status));
  const waitlist = all.filter((r) => r.status === "waitlisted");
  const refunds = all.filter((r) => r.status === "canceled" && r.payment_status === "paid");
  const prev = new Map(((results?.rewards ?? []) as Reward[]).map((r) => [r.character_id, r]));
  const wc = (results?.world_changes ?? {}) as { flags?: { key: string; delta: number }[]; locations?: { location_id: string; new_status: string | null; discovered?: boolean }[]; chronicle?: { title: string; excerpt: string; body: string; category: string } | null };
  const locked = results?.status === "approved";
  const senior = roleAtLeast(viewer.profile.role, "senior_gm");
  const admin = roleAtLeast(viewer.profile.role, "admin");
  const canRun = senior || session.gm_id === viewer.userId;

  return (
    <div>
      <Link href="/gm/sessions/" className="link text-sm">← Session Manager</Link>
      <PageHeader eyebrow={dateTime(session.starts_at)} title={session.template.title}
        action={<span className="flex gap-2"><StatusPill status={session.status === "scheduled" ? "open" : session.status} />{results && <StatusPill status={results.status} label={`results ${results.status}`} />}</span>}>
        {session.venue}{session.table_label ? ` · ${session.table_label}` : ""} · {money(session.price_cents)} · {seated.length}/{session.capacity} seated{waitlist.length ? ` · ${waitlist.length} waitlisted` : ""}
      </PageHeader>
      {!canRun && <p className="panel mb-6 text-sm">You are not the assigned GM for this session. You can view it, but only the assigned GM or a Senior GM can record results.</p>}

      <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <section id="roster" className="panel overflow-x-auto">
          <h2 className="heading text-xl">Roster &amp; live table</h2>
          <table className="table-eb mt-3">
            <thead><tr><th>Adventurer</th><th>Lvl / Rank</th><th>HP &amp; conditions</th><th>Seat</th><th /></tr></thead>
            <tbody>
              {seated.map((r) => {
                const t = tmap.get(r.character.id);
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="font-semibold">{r.character.name}</span><span className="muted block text-xs capitalize">{r.character.species.replace("_", " ")} {r.character.class}</span>
                      {(() => {
                        const bag = packs.filter((p) => p.character_id === r.character.id && ["consumable", "gear"].includes(p.item.item_type));
                        return bag.length > 0 && (
                          <details className="mt-1">
                            <summary className="cursor-pointer font-ui text-[12px] font-bold uppercase tracking-wider text-arcane-light">Pack · {bag.reduce((n, b) => n + b.quantity, 0)} items</summary>
                            <ul className="mt-1 grid gap-1">
                              {bag.map((b) => (
                                <li key={b.item.id} className="flex items-center justify-between gap-2 text-xs">
                                  <span className={`rarity-${b.item.rarity}`}>{b.item.name} ×{b.quantity}</span>
                                  {b.item.item_type === "consumable" && <form action={act(() => gmUseItem(r.id, b.item.id), after)}><SubmitButton className="btn-arcane btn-sm !min-h-[28px] !px-2 !py-0.5" pendingText="…">Use</SubmitButton></form>}
                                </li>
                              ))}
                            </ul>
                          </details>
                        );
                      })()}
                    </td>
                    <td>{t?.level ?? "?"} / {t?.rank_code ?? "?"}</td>
                    <td>
                      <form action={act(updateLiveState, after)} className="flex flex-wrap items-center gap-1">
                        <input type="hidden" name="reservation_id" value={r.id} />
                        <label className="sr-only" htmlFor={`hp-${r.id}`}>HP</label>
                        <input id={`hp-${r.id}`} name="hp" type="number" className="input w-16 min-h-[36px] py-1" defaultValue={r.live_hp ?? r.character.hp_current} max={r.character.hp_max} min={0} />
                        <span className="muted text-xs">/ {r.character.hp_max}</span>
                        <label className="sr-only" htmlFor={`cond-${r.id}`}>Conditions</label>
                        <input id={`cond-${r.id}`} name="conditions" className="input min-h-[36px] w-28 py-1 text-xs" placeholder="conditions" defaultValue={r.live_conditions ?? r.character.conditions ?? ""} />
                        <SubmitButton className="btn-arcane btn-sm" pendingText="…">Set</SubmitButton>
                      </form>
                    </td>
                    <td><StatusPill status={r.status} /><span className="muted block text-[11px]">{r.payment_status.replace("_", " ")}</span></td>
                    <td className="space-y-1">
                      {admin && r.amount_cents > 0 && !["paid", "comped"].includes(r.payment_status) && (
                        <form action={act(() => setPaymentStatus(r.id, "paid"), after)}><SubmitButton className="btn-ghost btn-sm">Paid in store</SubmitButton></form>
                      )}
                      {!locked && ["confirmed", "pending_payment"].includes(r.status) && (
                        <form action={act(() => cancelReservation(r.id), after)}><SubmitButton className="btn-danger btn-sm" confirm={`Remove ${r.character.name} from this session?`}>Remove</SubmitButton></form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {seated.length === 0 && <tr><td colSpan={5} className="muted">No one has booked yet.</td></tr>}
            </tbody>
          </table>
          {waitlist.length > 0 && <p className="muted mt-3 text-sm">Waitlist: {waitlist.map((w) => w.character.name).join(", ")}</p>}
          {refunds.length > 0 && (
            <div className="mt-3 rounded-lg border border-ember/50 p-3 text-sm">
              <p className="font-semibold text-ember">Canceled after paying — refund in Stripe, then mark refunded:</p>
              {refunds.map((r) => (
                <div key={r.id} className="mt-2 flex items-center justify-between gap-2">
                  <span>{r.character.name} · {money(r.amount_cents)}</span>
                  {admin && <form action={act(() => setPaymentStatus(r.id, "refunded"), after)}><SubmitButton className="btn-ghost btn-sm">Mark refunded</SubmitButton></form>}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid h-fit gap-6">
          <form action={act(saveSessionNotes)} className="panel grid gap-2">
            <input type="hidden" name="id" value={id} />
            <label className="heading text-lg" htmlFor="notes">Session notes (staff only)</label>
            <textarea id="notes" name="notes" className="input min-h-[140px]" defaultValue={notes?.notes ?? ""} placeholder="NPCs met, loot found, things to remember…" />
            <SubmitButton className="btn-ghost">Save notes</SubmitButton>
          </form>
          {secrets && (
            <details className="panel">
              <summary className="cursor-pointer font-display text-lg text-gold-light">GM secrets for this quest</summary>
              <div className="mt-3 grid gap-3 whitespace-pre-line text-sm">
                {secrets.gm_notes && <p><strong>Story:</strong> {secrets.gm_notes}</p>}
                {secrets.npcs && <p><strong>NPCs:</strong> {secrets.npcs}</p>}
                {secrets.encounter_notes && <p><strong>Encounters:</strong> {secrets.encounter_notes}</p>}
                {secrets.consequence_hooks && <p><strong>Consequences:</strong> {secrets.consequence_hooks}</p>}
              </div>
            </details>
          )}
          {canRun && !locked && (
            <form action={act(updateSession, after)} className="panel grid gap-3">
              <input type="hidden" name="id" value={id} />
              <h2 className="heading text-lg">Session settings</h2>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label" htmlFor="capacity">Seats</label><input className="input" type="number" id="capacity" name="capacity" min={1} max={20} defaultValue={session.capacity} /></div>
                <div><label className="label" htmlFor="table_label">Table</label><input className="input" id="table_label" name="table_label" defaultValue={session.table_label ?? ""} /></div>
              </div>
              <div><label className="label" htmlFor="gm_id">Game Master</label>
                <select className="input" id="gm_id" name="gm_id" defaultValue={session.gm_id ?? ""}><option value="">Unassigned</option>{(staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}</select></div>
              <div><label className="label" htmlFor="status">Status</label>
                <select className="input" id="status" name="status" defaultValue={session.status}>{["scheduled", "in_progress", "canceled"].map((s) => <option key={s}>{s}</option>)}</select></div>
              <SubmitButton className="btn-ghost">Update session</SubmitButton>
            </form>
          )}
        </div>
      </div>

      <section id="results" className="mt-8">
        <h2 className="heading text-2xl">End session · results &amp; rewards</h2>
        {results?.status === "rejected" && <p className="mt-2 text-sm text-ember">Returned by a Senior GM: {results.rejection_reason}</p>}
        {locked ? (
          <div className="panel mt-4">
            <p>Results were approved and published{results?.approved_at ? ` on ${dateTime(results.approved_at)}` : ""}. Rewards, world changes and the Chronicle were updated in one transaction and cannot be re-applied.</p>
            {results?.summary_public && <p className="muted mt-2 text-sm">{results.summary_public}</p>}
          </div>
        ) : canRun ? (
          <form action={act((fd) => saveResults(fd, fd.get("intent") === "submit" ? "submit" : "draft"), after)} className="mt-4 grid gap-6">
            <input type="hidden" name="session_id" value={id} />
            <div className="panel overflow-x-auto">
              <h3 className="font-display text-lg text-gold-light">Proposed rewards</h3>
              <p className="muted text-xs">Session hint: {session.template.reward_preview ?? "—"}. Untick “attended” for no-shows. You cannot approve rewards to your own character.</p>
              <table className="table-eb mt-3">
                <thead><tr><th>Adventurer</th><th>Attended</th><th>XP</th><th>Gold</th><th>Renown</th><th>Loot</th><th>Achievement</th><th>Journal note</th></tr></thead>
                <tbody>
                  {seated.map((r) => {
                    const p = prev.get(r.character.id);
                    const cid = r.character.id;
                    return (
                      <tr key={cid}>
                        <td className="font-semibold"><input type="hidden" name="character_id" value={cid} />{r.character.name}</td>
                        <td><input type="checkbox" name={`attended_${cid}`} defaultChecked={p?.attended ?? r.status !== "no_show"} className="h-5 w-5 accent-gold" aria-label={`${r.character.name} attended`} /></td>
                        <td><input className="input min-h-[36px] w-20 py-1" type="number" name={`xp_${cid}`} defaultValue={p?.xp ?? 300} aria-label="XP" /></td>
                        <td><input className="input min-h-[36px] w-20 py-1" type="number" name={`gold_${cid}`} defaultValue={p?.gold ?? 0} aria-label="Gold" /></td>
                        <td><input className="input min-h-[36px] w-20 py-1" type="number" name={`renown_${cid}`} defaultValue={p?.renown ?? 0} aria-label="Renown" /></td>
                        <td>
                          <select className="input min-h-[36px] w-36 py-1 text-xs" name={`item_${cid}`} defaultValue={p?.items?.[0]?.item_id ?? ""} aria-label="Loot"><option value="">—</option>{(items ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                        </td>
                        <td>
                          <select className="input min-h-[36px] w-36 py-1 text-xs" name={`ach_${cid}`} defaultValue={p?.achievements?.[0] ?? ""} aria-label="Achievement"><option value="">—</option>{(achievements ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                        </td>
                        <td><input className="input min-h-[36px] w-48 py-1 text-xs" name={`note_${cid}`} defaultValue={p?.note ?? ""} aria-label="Journal note" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="panel grid gap-3">
                <h3 className="font-display text-lg text-gold-light">Outcome</h3>
                <div><label className="label" htmlFor="summary_public">Spoiler-safe recap (Quest Archive)</label><textarea className="input min-h-[100px]" id="summary_public" name="summary_public" defaultValue={results?.summary_public ?? ""} /></div>
                <div><label className="label" htmlFor="decisions">Major decisions (staff record)</label><textarea className="input min-h-[80px]" id="decisions" name="decisions" defaultValue={results?.decisions ?? ""} /></div>
              </div>
              <div className="panel grid gap-3">
                <h3 className="font-display text-lg text-gold-light">World consequences</h3>
                <p className="muted text-xs">Flags change by +/− amounts so two tables never overwrite each other. Location changes record the status you saw; if another table changed it first, it goes to an admin for review.</p>
                {[0, 1, 2].map((i) => (
                  <div key={`f${i}`} className="flex gap-2">
                    <select className="input text-sm" name={`flag_key_${i}`} defaultValue={wc.flags?.[i]?.key ?? ""} aria-label={`World flag ${i + 1}`}><option value="">World flag…</option>{(flags ?? []).map((f) => <option key={f.key} value={f.key}>{f.label} (now {f.value})</option>)}</select>
                    <input className="input w-24" type="number" name={`flag_delta_${i}`} defaultValue={wc.flags?.[i]?.delta ?? ""} placeholder="±" aria-label="Change" />
                  </div>
                ))}
                {[0, 1, 2].map((i) => {
                  const pl = wc.locations?.[i];
                  return (
                    <div key={`l${i}`} className="flex flex-wrap gap-2">
                      <select className="input flex-1 text-sm" name={`loc_${i}`} defaultValue={pl ? `${pl.location_id}|${(locations ?? []).find((l) => l.id === pl.location_id)?.status ?? ""}` : ""} aria-label={`Location ${i + 1}`}>
                        <option value="">Location…</option>
                        {(locations ?? []).map((l) => <option key={l.id} value={`${l.id}|${l.status}`}>{l.name} ({l.status}{l.is_discovered ? "" : ", hidden"})</option>)}
                      </select>
                      <select className="input w-32 text-sm" name={`loc_status_${i}`} defaultValue={pl?.new_status ?? ""} aria-label="New status"><option value="">no change</option>{LOCATION_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name={`loc_disc_${i}`} defaultChecked={pl?.discovered} className="accent-gold" />discover</label>
                    </div>
                  );
                })}
                <details open={!!wc.chronicle}>
                  <summary className="cursor-pointer text-sm text-arcane-light">Publish a Chronicle story on approval</summary>
                  <div className="mt-2 grid gap-2">
                    <input className="input" name="chronicle_title" placeholder="Headline" defaultValue={wc.chronicle?.title ?? ""} />
                    <select className="input" name="chronicle_category" defaultValue={wc.chronicle?.category ?? "adventure_outcome"}>{Object.entries(CHRONICLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <input className="input" name="chronicle_excerpt" placeholder="One-line excerpt" defaultValue={wc.chronicle?.excerpt ?? ""} />
                    <textarea className="input min-h-[100px]" name="chronicle_body" placeholder="The story, spoiler-safe" defaultValue={wc.chronicle?.body ?? ""} />
                  </div>
                </details>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" name="intent" value="draft" className="btn-ghost">Save draft</button>
              <button type="submit" name="intent" value="submit" className="btn-gold">Submit for approval</button>
            </div>
          </form>
        ) : null}

        {results?.status === "submitted" && senior && (
          <div className="panel-arcane mt-6 grid gap-4 sm:grid-cols-2">
            <form action={act(() => approveResults(id), after)} className="grid gap-2">
              <input type="hidden" name="session_id" value={id} />
              <p className="text-sm">Approving applies all XP, gold, renown, loot, achievements, attendance, world changes and the Chronicle story in one transaction.</p>
              <SubmitButton confirm="Approve and publish these results? This cannot be undone (corrections become new ledger entries).">Approve &amp; publish</SubmitButton>
            </form>
            <form action={act(rejectResults, after)} className="grid gap-2">
              <input type="hidden" name="session_id" value={id} />
              <label className="label" htmlFor="reason">Return to GM with a note</label>
              <input className="input" id="reason" name="reason" placeholder="e.g. Renown seems high for a contract" />
              <SubmitButton className="btn-danger">Return for changes</SubmitButton>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
