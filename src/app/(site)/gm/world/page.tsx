import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { adjustFlag, createFlag, publishChronicle, resolveConflict, saveLocationLore, setLocation, toggleChronicle } from "@/app/actions/gm";
import { Flash, PageHeader, StatusPill, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { CHRONICLE_LABEL, LOCATION_STATUSES, relative, shortDate } from "@/lib/format";
import { roleAtLeast, type Location } from "@/lib/types";

export const metadata = { title: "World Editor" };

export default async function WorldEditor({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireRole("game_master");
  const senior = roleAtLeast(viewer.profile.role, "senior_gm");
  const admin = roleAtLeast(viewer.profile.role, "admin");
  const supabase = await createClient();
  const [{ data: locations }, { data: flags }, { data: events }, { data: posts }] = await Promise.all([
    supabase.from("locations").select("*").order("region").order("name"),
    supabase.from("world_flags").select("*").order("label"),
    supabase.from("world_events").select("*, location:locations(name)").order("created_at", { ascending: false }).limit(40),
    supabase.from("chronicle_posts").select("id, title, category, published, published_at, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const conflicts = (events ?? []).filter((e) => e.status === "conflict");
  return (
    <div>
      <PageHeader eyebrow="Persistent world state" title="World Editor">Every change is timestamped and attributed in the world history below.{!senior && " Senior GMs can edit; you have read access."}</PageHeader>
      <Flash ok={q.ok} error={q.error} />

      {conflicts.length > 0 && (
        <section className="panel-arcane mb-8">
          <h2 className="heading text-lg">Conflicting updates awaiting review</h2>
          <ul className="mt-3 grid gap-2">
            {conflicts.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-midnight-600 p-3 text-sm">
                <span>{e.description}</span>
                {admin && (
                  <span className="flex gap-2">
                    <form action={resolveConflict}><input type="hidden" name="event_id" value={e.id} /><input type="hidden" name="apply" value="true" /><SubmitButton className="btn-gold btn-sm">Apply {e.new_status}</SubmitButton></form>
                    <form action={resolveConflict}><input type="hidden" name="event_id" value={e.id} /><input type="hidden" name="apply" value="false" /><SubmitButton className="btn-ghost btn-sm">Keep {e.old_status}</SubmitButton></form>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.5fr,1fr]">
        <section>
          <h2 className="heading text-xl">Locations</h2>
          <div className="mt-3 grid gap-3">
            {((locations ?? []) as Location[]).map((l) => (
              <details key={l.id} className="panel">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-lg text-gold-light">{l.name} <span className="muted text-xs">· {l.region}</span></span>
                  <span className="flex gap-2"><StatusPill status={l.status} />{!l.is_discovered && <StatusPill status="locked" label="undiscovered" />}</span>
                </summary>
                {senior && (
                  <div className="mt-4 grid gap-4">
                    <form action={setLocation} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="location_id" value={l.id} /><input type="hidden" name="expected" value={l.status} />
                      <div><label className="label" htmlFor={`st-${l.id}`}>Status</label><select id={`st-${l.id}`} className="input" name="status" defaultValue={l.status}>{LOCATION_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
                      <div className="flex-1"><label className="label" htmlFor={`rs-${l.id}`}>Reason (logged)</label><input id={`rs-${l.id}`} className="input" name="reason" placeholder="e.g. Bandits routed by the Tuesday party" /></div>
                      {!l.is_discovered && <label className="flex items-center gap-1 pb-3 text-xs"><input type="checkbox" name="discovered" className="accent-gold" />reveal on map</label>}
                      <SubmitButton className="btn-gold">Apply</SubmitButton>
                    </form>
                    <form action={saveLocationLore} className="grid gap-2">
                      <input type="hidden" name="location_id" value={l.id} />
                      <input className="input" name="summary" defaultValue={l.summary ?? ""} placeholder="Summary" aria-label="Summary" />
                      <textarea className="input min-h-[80px]" name="lore" defaultValue={l.lore ?? ""} placeholder="Public lore" aria-label="Lore" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input className="input" name="threat" defaultValue={l.threat ?? ""} placeholder="Known threats" aria-label="Threats" />
                        <input className="input" name="discovered_by" defaultValue={l.discovered_by ?? ""} placeholder="Discovery credit" aria-label="Discovery credit" />
                      </div>
                      <SubmitButton className="btn-ghost">Save lore</SubmitButton>
                    </form>
                  </div>
                )}
              </details>
            ))}
          </div>
        </section>

        <div className="grid h-fit gap-6">
          <section className="panel">
            <h2 className="heading text-xl">World flags</h2>
            <p className="muted text-xs">Story variables. Raids watch these and unlock automatically when a target is reached.</p>
            <ul className="mt-3 grid gap-2">
              {(flags ?? []).map((f) => (
                <li key={f.key} className="rounded-lg border border-midnight-600 p-3">
                  <div className="flex justify-between"><span className="font-semibold">{f.label}</span><span className="font-display text-xl text-arcane-light">{f.value}</span></div>
                  <p className="muted font-mono text-[11px]">{f.key}{f.is_public ? " · public" : " · hidden"}</p>
                  {senior && (
                    <form action={adjustFlag} className="mt-2 flex gap-2">
                      <input type="hidden" name="key" value={f.key} />
                      <input className="input min-h-[36px] w-20 py-1" type="number" name="delta" placeholder="±1" required aria-label="Change by" />
                      <input className="input min-h-[36px] py-1 text-xs" name="reason" placeholder="reason" aria-label="Reason" />
                      <SubmitButton className="btn-arcane btn-sm">Apply</SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {senior && (
              <form action={createFlag} className="mt-4 grid gap-2 border-t border-midnight-700 pt-4">
                <input className="input" name="key" placeholder="flag_key" required aria-label="Key" />
                <input className="input" name="label" placeholder="Human label" required aria-label="Label" />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_public" className="accent-gold" />Show on public world page</label>
                <SubmitButton className="btn-ghost btn-sm">Add flag</SubmitButton>
              </form>
            )}
          </section>
        </div>
      </div>

      <section id="chronicle" className="mt-10 grid gap-6 lg:grid-cols-2">
        {senior && (
          <form action={publishChronicle} className="panel grid gap-3">
            <h2 className="heading text-xl">Write for the Chronicle</h2>
            <input className="input" name="title" placeholder="Headline" required aria-label="Headline" />
            <div className="grid grid-cols-2 gap-2">
              <select className="input" name="category" aria-label="Category">{Object.entries(CHRONICLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <select className="input" name="location_id" aria-label="Location"><option value="">No location</option>{(locations ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
            </div>
            <input className="input" name="excerpt" placeholder="One-line excerpt" required aria-label="Excerpt" />
            <textarea className="input min-h-[140px]" name="body" placeholder="The story (spoiler-safe)" required aria-label="Body" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" className="accent-gold" />Feature on homepage</label>
            <div className="flex gap-2">
              <button type="submit" name="intent" value="publish" className="btn-gold">Publish</button>
              <button type="submit" name="intent" value="draft" className="btn-ghost">Save draft</button>
            </div>
          </form>
        )}
        <div className="panel">
          <h2 className="heading text-xl">Recent posts</h2>
          <ul className="mt-3 grid gap-2">
            {(posts ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{p.title} <span className="muted text-xs">· {CHRONICLE_LABEL[p.category]} · {shortDate(p.published_at ?? p.created_at)}</span></span>
                {senior && (
                  <form action={toggleChronicle}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="publish" value={String(!p.published)} /><SubmitButton className="btn-ghost btn-sm">{p.published ? "Unpublish" : "Publish"}</SubmitButton></form>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="heading text-xl">World history</h2>
        <div className="panel mt-3 overflow-x-auto p-0">
          <table className="table-eb">
            <thead><tr><th>When</th><th>Event</th><th>Change</th><th>Status</th></tr></thead>
            <tbody>
              {(events ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-xs">{relative(e.created_at)}</td>
                  <td className="text-sm">{e.description}</td>
                  <td className="whitespace-nowrap text-xs">{e.flag_key ? `${e.flag_key}: ${e.old_value} → ${e.new_value}` : e.old_status ? `${e.location?.name}: ${e.old_status} → ${e.new_status}` : e.event_type}</td>
                  <td><StatusPill status={e.status === "applied" ? "approved" : e.status === "conflict" ? "waitlisted" : "rejected"} label={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
