"use client";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { isSupabaseConfigured } from "@/lib/env";
import { registerForRaid } from "@/lib/actions";
import { Crest } from "@/components/Crest";
import { MagicCircle } from "@/components/MagicCircle";
import { Loading, useTitle } from "@/components/Guard";
import { PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { SetupNotice } from "@/components/SetupNotice";
import { dateTime } from "@/lib/format";
import Link from "next/link";
import type { Faction, PublicRaid, RaidSides } from "@/lib/types";


const STAGES = ["dormant", "foreshadowed", "unlocked", "registration", "active", "resolved"];

export default function RaidsPage() {
  useTitle("Raid Center");
  const { viewer } = useViewer();
  const act = useAct();
  const { data: all, reload } = useData(async () => {
    const [raids, sides, factions] = await Promise.all([must(sb().rpc("get_raids_public")), must(sb().rpc("get_raid_sides")), must(sb().rpc("get_factions"))]);
    return { raids: raids as PublicRaid[], sides: new Map((sides as RaidSides[]).map((x) => [x.raid_id, x])), factions: factions as Faction[] };
  }, [viewer?.userId]);
  const data = all?.raids;
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (!data) return <Loading />;
  const raids = data;
  const myFaction = all!.factions.find((f) => f.id === viewer?.character?.faction_id) ?? all!.factions.find((f) => f.is_default);
  return (
    <div className="container-eb max-w-4xl py-12">
      <PageHeader eyebrow="Everbound · Raid Center" title="The Sealed Gate">
        The Raid Center sleeps until something in the world awakens it. Raids run in scheduled windows with alternates, so you never need to drop everything.
      </PageHeader>
      {raids.length === 0 && (
        <div className="panel text-center sm:p-12">
          <Crest className="mx-auto h-24 w-24 opacity-60" />
          <p className="mt-4 font-display text-xl text-parchment/70">No active threat has been detected.</p>
        </div>
      )}
      <div className="grid gap-6">
        {raids.map((r) => {
          const sealed = r.state === "dormant" || r.state === "foreshadowed";
          const sides = all!.sides.get(r.id);
          return (
            <section key={r.id} className={`${sealed ? "panel" : "panel-arcane arcane-shimmer"} text-center sm:p-10`}>
              <div className="relative mx-auto h-48 w-48">
                <MagicCircle className="absolute inset-0" tone={sealed ? "#B07CFF" : "#E0533D"} />
                <Crest className={`absolute inset-[30%] h-[40%] w-[40%] ${sealed ? "opacity-80 rune-pulse" : ""}`} glow={!sealed} />
              </div>
              <h2 className="heading mt-4 text-3xl">{r.name}</h2>
              <div className="mt-2 flex justify-center gap-2">
                <StatusPill status={sealed ? "locked" : r.state === "registration" ? "open" : "completed"} label={r.state} />
                {r.is_paused && <StatusPill status="waitlisted" label="paused by Guild Masters" />}
                {sides?.two_sided && <Link href="/allegiances/" className="rounded-sm border border-ember bg-ember/15 px-2 py-0.5 font-ui text-[12px] font-bold uppercase tracking-wider text-ember-light">⚔ Two-sided · PvP</Link>}
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
                  {sides?.two_sided && (<><dt className="muted text-left">Raiders · Defenders</dt><dd className="text-right"><span className="text-gold-light">{sides.attackers}</span> · <span className="text-ember-light">{sides.defenders}</span></dd></>)}
                </dl>
              )}
              {r.state === "registration" && !r.is_paused && (
                <div className="mt-6">
                  {r.my_registration && r.my_registration !== "canceled" ? (
                    <StatusPill status={r.my_registration === "registered" ? "confirmed" : "waitlisted"} label={`You are ${r.my_registration}${sides?.two_sided && sides.my_side ? ` with the ${sides.my_side}` : ""}`} />
                  ) : viewer?.character && sides?.two_sided && !viewer.character.pvp_opt_in ? (
                    <p className="mx-auto max-w-sm text-sm text-parchment/85">In this raid players fight each other. <Link className="link" href="/portal/allegiance/">Turn on PvP</Link> to answer the call.</p>
                  ) : viewer?.character ? (
                    <form action={act((fd) => registerForRaid(fd, viewer!.character!.id), { after: reload })} className="mx-auto grid max-w-sm gap-2">
                      <input type="hidden" name="raid_id" value={r.id} />
                      <label className="label text-left" htmlFor={`w-${r.id}`}>Preferred window (optional)</label>
                      <input id={`w-${r.id}`} name="window" className="input" placeholder="e.g. Friday evening or Saturday afternoon" />
                      {sides?.two_sided && myFaction && (myFaction.raid_side === "either" ? (
                        <>
                          <label className="label text-left" htmlFor={`side-${r.id}`}>Your side ({myFaction.name} may choose)</label>
                          <select id={`side-${r.id}`} name="side" className="input" defaultValue="attackers"><option value="attackers">Raiders: break the seal</option><option value="defenders">Defenders: guard the Wyrm</option></select>
                        </>
                      ) : (
                        <p className="text-left text-sm text-parchment/80">As {myFaction.name} you fight with the <strong className={myFaction.raid_side === "defenders" ? "text-ember-light" : "text-gold-light"}>{myFaction.raid_side}</strong>.</p>
                      ))}
                      <SubmitButton>Answer the call</SubmitButton>
                    </form>
                  ) : (
                    <p className="muted text-sm">Sign in with a registered adventurer to join this raid.</p>
                  )}
                </div>
              )}
              <ol className="mx-auto mt-8 flex max-w-lg flex-wrap justify-center gap-x-4 gap-y-1 font-ui text-[11px] font-bold uppercase tracking-[0.14em] text-parchment/40" aria-label="Raid progress">
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
