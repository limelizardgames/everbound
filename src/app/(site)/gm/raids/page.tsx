import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { setRaidState, toggleRaidPause, updateRaid } from "@/app/actions/raids";
import { Flash, PageHeader, StatusPill, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { toZonedInput } from "@/lib/format";
import { roleAtLeast } from "@/lib/types";

export const metadata = { title: "Raid Controller" };
const STATES = ["dormant", "foreshadowed", "unlocked", "registration", "active", "resolved", "archived"];

export default async function RaidController({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireRole("game_master");
  const senior = roleAtLeast(viewer.profile.role, "senior_gm");
  const admin = roleAtLeast(viewer.profile.role, "admin");
  const supabase = await createClient();
  const [{ data: raids }, { data: flags }, { data: regs }, { data: ranks }] = await Promise.all([
    supabase.from("raids").select("*").order("created_at"),
    supabase.from("world_flags").select("key, label, value"),
    supabase.from("raid_registrations").select("raid_id, status, preferred_window, character:characters(name)").neq("status", "canceled"),
    supabase.from("rank_definitions").select("code").order("sort"),
  ]);
  const fmap = new Map((flags ?? []).map((f) => [f.key, f]));
  return (
    <div>
      <PageHeader eyebrow="Event engine" title="Raid Controller">
        DORMANT → FORESHADOWED → UNLOCKED → REGISTRATION → ACTIVE → RESOLVED → ARCHIVED. Unlocks fire automatically on the server when their world flag hits the target. Pause stops automatic transitions.
      </PageHeader>
      <Flash ok={q.ok} error={q.error} />
      <div className="grid gap-6">
        {(raids ?? []).map((r) => {
          const f = r.condition_flag_key ? fmap.get(r.condition_flag_key) : null;
          const idx = STATES.indexOf(r.state);
          const mine = (regs ?? []).filter((g) => g.raid_id === r.id) as unknown as { status: string; preferred_window: string | null; character: { name: string } }[];
          return (
            <section key={r.id} className="panel-arcane grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="heading text-2xl">{r.name}</h2>
                <span className="flex gap-2"><StatusPill status="unassigned" label={r.state} />{r.is_paused && <StatusPill status="waitlisted" label="paused" />}</span>
              </div>
              <ol className="flex flex-wrap gap-1 text-[11px] uppercase tracking-wider">
                {STATES.map((s, i) => <li key={s} className={`rounded px-2 py-1 ${i === idx ? "bg-arcane text-midnight font-bold" : i < idx ? "bg-arcane/20 text-arcane-light" : "bg-midnight-700 text-parchment/50"}`}>{s}</li>)}
              </ol>
              {f && <p className="text-sm">Trigger: <strong>{f.label}</strong> is {f.value} / {r.condition_target}</p>}
              {senior && (
                <div className="flex flex-wrap gap-2">
                  {idx < STATES.length - 1 && (
                    <form action={setRaidState}><input type="hidden" name="raid_id" value={r.id} /><input type="hidden" name="state" value={STATES[idx + 1]} /><SubmitButton confirm={`Advance ${r.name} to ${STATES[idx + 1]}?`}>Advance to {STATES[idx + 1]}</SubmitButton></form>
                  )}
                  <form action={toggleRaidPause}><input type="hidden" name="raid_id" value={r.id} /><input type="hidden" name="paused" value={String(!r.is_paused)} /><SubmitButton className={r.is_paused ? "btn-arcane" : "btn-danger"}>{r.is_paused ? "Resume" : "Emergency pause"}</SubmitButton></form>
                  {admin && (
                    <form action={setRaidState} className="flex gap-1">
                      <input type="hidden" name="raid_id" value={r.id} /><input type="hidden" name="override" value="on" />
                      <select name="state" className="input min-h-[44px] w-40" defaultValue={r.state} aria-label="Override state">{STATES.map((s) => <option key={s}>{s}</option>)}</select>
                      <SubmitButton className="btn-ghost" confirm="Override raid state? This is logged.">Override</SubmitButton>
                    </form>
                  )}
                </div>
              )}
              {senior && (
                <details>
                  <summary className="cursor-pointer text-sm text-arcane-light">Edit raid details</summary>
                  <form action={updateRaid} className="mt-3 grid gap-2">
                    <input type="hidden" name="raid_id" value={r.id} />
                    <label className="label" htmlFor={`fs-${r.id}`}>Foreshadowing (public while sealed)</label>
                    <textarea id={`fs-${r.id}`} className="input" name="foreshadow_text" defaultValue={r.foreshadow_text ?? ""} />
                    <label className="label" htmlFor={`rv-${r.id}`}>Reveal (public after unlock)</label>
                    <textarea id={`rv-${r.id}`} className="input" name="reveal_text" defaultValue={r.reveal_text ?? ""} />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div><label className="label" htmlFor={`cap-${r.id}`}>Capacity</label><input id={`cap-${r.id}`} className="input" type="number" name="capacity" defaultValue={r.capacity ?? ""} /></div>
                      <div><label className="label" htmlFor={`mr-${r.id}`}>Min rank</label><select id={`mr-${r.id}`} className="input" name="min_rank" defaultValue={r.min_rank ?? ""}><option value="">none</option>{(ranks ?? []).map((k) => <option key={k.code}>{k.code}</option>)}</select></div>
                      <div><label className="label" htmlFor={`st-${r.id}`}>Raid window starts</label><input id={`st-${r.id}`} className="input" type="datetime-local" name="starts_at" defaultValue={r.starts_at ? toZonedInput(r.starts_at) : ""} /></div>
                    </div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="conditions_public" defaultChecked={r.conditions_public} className="accent-gold" />Show unlock progress publicly (e.g. “Ancient Seal 3/5”)</label>
                    <SubmitButton className="btn-ghost">Save</SubmitButton>
                  </form>
                </details>
              )}
              <div>
                <h3 className="eyebrow">Registrations ({mine.length}{r.capacity ? ` / ${r.capacity}` : ""})</h3>
                <ul className="mt-2 grid gap-1 text-sm">
                  {mine.map((g, i) => <li key={i}>{g.character.name} <span className="muted">· {g.status}{g.preferred_window ? ` · prefers ${g.preferred_window}` : ""}</span></li>)}
                  {mine.length === 0 && <li className="muted">None yet.</li>}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
