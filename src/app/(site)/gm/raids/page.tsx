"use client";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { setRaidState, toggleRaidPause, updateRaid } from "@/lib/actions";
import { PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { toZonedInput } from "@/lib/format";
import { roleAtLeast } from "@/lib/types";

const STATES = ["dormant", "foreshadowed", "unlocked", "registration", "active", "resolved", "archived"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raid = any;

export default function RaidController() {
  useTitle("Raid Controller");
  const { viewer } = useViewer();
  const act = useAct();
  const { data, reload } = useData(async () => {
    const [raids, flags, regs, ranks] = await Promise.all([
      must(sb().from("raids").select("*").order("created_at")),
      must(sb().from("world_flags").select("key, label, value")),
      must(sb().from("raid_registrations").select("raid_id, status, preferred_window, character:characters(name)").neq("status", "canceled")),
      must(sb().from("rank_definitions").select("code").order("sort")),
    ]);
    return { raids: raids as Raid[], flags: flags as { key: string; label: string; value: number }[], regs: regs as Raid[], ranks: ranks as { code: string }[] };
  }, []);
  if (!data || !viewer) return <Loading />;
  const { raids, flags, regs, ranks } = data;
  const senior = roleAtLeast(viewer.profile.role, "senior_gm");
  const admin = roleAtLeast(viewer.profile.role, "admin");
  const after = { after: reload };
  const fmap = new Map((flags ?? []).map((f) => [f.key, f]));
  return (
    <div>
      <PageHeader eyebrow="Event engine" title="Raid Controller">
        DORMANT → FORESHADOWED → UNLOCKED → REGISTRATION → ACTIVE → RESOLVED → ARCHIVED. Unlocks fire automatically on the server when their world flag hits the target. Pause stops automatic transitions.
      </PageHeader>
      <div className="grid gap-6">
        {raids.map((r: Raid) => {
          const f = r.condition_flag_key ? fmap.get(r.condition_flag_key) : null;
          const idx = STATES.indexOf(r.state);
          const mine = regs.filter((g: Raid) => g.raid_id === r.id) as unknown as { status: string; preferred_window: string | null; character: { name: string } }[];
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
                    <form action={act(() => setRaidState(r.id, STATES[idx + 1]), after)}><SubmitButton confirm={`Advance ${r.name} to ${STATES[idx + 1]}?`}>Advance to {STATES[idx + 1]}</SubmitButton></form>
                  )}
                  <form action={act(() => toggleRaidPause(r.id, !r.is_paused), after)}><SubmitButton className={r.is_paused ? "btn-arcane" : "btn-danger"}>{r.is_paused ? "Resume" : "Emergency pause"}</SubmitButton></form>
                  {admin && (
                    <form action={act((fd) => setRaidState(r.id, String(fd.get("state")), true), after)} className="flex gap-1">
                      <select name="state" className="input min-h-[44px] w-40" defaultValue={r.state} aria-label="Override state">{STATES.map((s) => <option key={s}>{s}</option>)}</select>
                      <SubmitButton className="btn-ghost" confirm="Override raid state? This is logged.">Override</SubmitButton>
                    </form>
                  )}
                </div>
              )}
              {senior && (
                <details>
                  <summary className="cursor-pointer text-sm text-arcane-light">Edit raid details</summary>
                  <form action={act(updateRaid, after)} className="mt-3 grid gap-2">
                    <input type="hidden" name="raid_id" value={r.id} />
                    <label className="label" htmlFor={`fs-${r.id}`}>Foreshadowing (public while sealed)</label>
                    <textarea id={`fs-${r.id}`} className="input" name="foreshadow_text" defaultValue={r.foreshadow_text ?? ""} />
                    <label className="label" htmlFor={`rv-${r.id}`}>Reveal (public after unlock)</label>
                    <textarea id={`rv-${r.id}`} className="input" name="reveal_text" defaultValue={r.reveal_text ?? ""} />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div><label className="label" htmlFor={`cap-${r.id}`}>Capacity</label><input id={`cap-${r.id}`} className="input" type="number" name="capacity" defaultValue={r.capacity ?? ""} /></div>
                      <div><label className="label" htmlFor={`mr-${r.id}`}>Min rank</label><select id={`mr-${r.id}`} className="input" name="min_rank" defaultValue={r.min_rank ?? ""}><option value="">none</option>{ranks.map((k) => <option key={k.code}>{k.code}</option>)}</select></div>
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
