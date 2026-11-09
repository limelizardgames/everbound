import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { registerForRaid } from "@/app/actions/raids";
import { Crest } from "@/components/Crest";
import { Flash, PageHeader, StatusPill, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { SetupNotice } from "@/components/SetupNotice";
import { dateTime } from "@/lib/format";
import type { PublicRaid } from "@/lib/types";

export const metadata = { title: "Raid Center" };
export const dynamic = "force-dynamic";

const STAGES = ["dormant", "foreshadowed", "unlocked", "registration", "active", "resolved"];

export default async function RaidsPage({ searchParams }: { searchParams: SP }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data }, viewer] = await Promise.all([supabase.rpc("get_raids_public"), getViewer()]);
  const raids = (data ?? []) as PublicRaid[];
  return (
    <div className="container-eb max-w-4xl py-12">
      <PageHeader eyebrow="Everbound · Raid Center" title="The Sealed Gate">
        The Raid Center sleeps until something in the world awakens it. Raids run in scheduled windows with alternates, so you never need to drop everything.
      </PageHeader>
      <Flash ok={query.ok} error={query.error} />
      {raids.length === 0 && (
        <div className="panel text-center sm:p-12">
          <Crest className="mx-auto h-24 w-24 opacity-60" />
          <p className="mt-4 font-display text-xl text-parchment/70">No active threat has been detected.</p>
        </div>
      )}
      <div className="grid gap-6">
        {raids.map((r) => {
          const sealed = r.state === "dormant" || r.state === "foreshadowed";
          return (
            <section key={r.id} className={`${sealed ? "panel" : "panel-arcane arcane-shimmer"} text-center sm:p-10`}>
              <Crest className={`mx-auto h-24 w-24 ${sealed ? "opacity-70 rune-pulse" : ""}`} glow={!sealed} />
              <h2 className="heading mt-4 text-3xl">{r.name}</h2>
              <div className="mt-2 flex justify-center gap-2">
                <StatusPill status={sealed ? "locked" : r.state === "registration" ? "open" : "completed"} label={r.state} />
                {r.is_paused && <StatusPill status="waitlisted" label="paused by Guild Masters" />}
              </div>
              <p className="mx-auto mt-4 max-w-xl text-parchment/85">{r.display_text}</p>
              {r.progress !== null && r.target !== null ? (
                <div className="mx-auto mt-6 max-w-xs">
                  <p className="font-display text-lg text-arcane-light">Ancient Seal {r.progress} / {r.target}</p>
                  <div className="mt-2 flex justify-center gap-2" aria-hidden>
                    {Array.from({ length: r.target }).map((_, i) => (
                      <span key={i} className={`h-4 w-4 rotate-45 border ${i < r.progress! ? "border-arcane bg-arcane shadow-glow" : "border-parchment/30"}`} />
                    ))}
                  </div>
                </div>
              ) : (
                sealed && <p className="muted mt-4 text-sm">Unlock conditions hidden</p>
              )}
              {!sealed && (
                <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-2 text-sm">
                  {r.starts_at && (<><dt className="muted text-left">Raid window</dt><dd className="text-right">{dateTime(r.starts_at)}</dd></>)}
                  {r.capacity && (<><dt className="muted text-left">Registered</dt><dd className="text-right">{r.registered} / {r.capacity}</dd></>)}
                  {r.min_rank && (<><dt className="muted text-left">Minimum rank</dt><dd className="text-right">{r.min_rank}</dd></>)}
                </dl>
              )}
              {r.state === "registration" && !r.is_paused && (
                <div className="mt-6">
                  {r.my_registration && r.my_registration !== "canceled" ? (
                    <StatusPill status={r.my_registration === "registered" ? "confirmed" : "waitlisted"} label={`You are ${r.my_registration}`} />
                  ) : viewer?.character ? (
                    <form action={registerForRaid} className="mx-auto grid max-w-sm gap-2">
                      <input type="hidden" name="raid_id" value={r.id} />
                      <label className="label text-left" htmlFor={`w-${r.id}`}>Preferred window (optional)</label>
                      <input id={`w-${r.id}`} name="window" className="input" placeholder="e.g. Friday evening or Saturday afternoon" />
                      <SubmitButton>Answer the call</SubmitButton>
                    </form>
                  ) : (
                    <p className="muted text-sm">Sign in with a registered adventurer to join this raid.</p>
                  )}
                </div>
              )}
              <ol className="mx-auto mt-8 flex max-w-lg justify-between text-[10px] uppercase tracking-wider text-parchment/40" aria-label="Raid progress">
                {STAGES.map((s) => (
                  <li key={s} className={s === r.state ? "font-bold text-arcane-light" : ""}>{s}</li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
