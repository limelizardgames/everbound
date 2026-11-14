"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { isSupabaseConfigured } from "@/lib/env";
import { Loading, useTitle } from "@/components/Guard";
import { PageHeader, SystemWindow, SectionHeading } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { FactionSigil, FACTION_TONE, RAID_SIDE_LABEL } from "@/components/FactionSigil";
import type { Faction } from "@/lib/types";

const MODES = [
  ["Skirmishes", "Two parties of opposing allegiances meet at the store and clash, with a Guild Master refereeing every roll."],
  ["Contested quests", "Rival parties race for the same objective. Whoever holds it at the end moves the world toward their side."],
  ["Raids with two sides", "When a raid like the Crimson Wyrm opens, Covenant adventurers defend the lair. The raid becomes a battle between players."],
];

const SAFEGUARDS = [
  "PvP is opt-in. You can play Everbound for ever without fighting another player.",
  "A Guild Master referees every clash, at the table, in person.",
  "Rivals in the story, friends at the table. The Code of Conduct always applies.",
  "Turn PvP off at any time, unless you are signed up for a PvP quest or two-sided raid.",
];

export default function AllegiancesPage() {
  useTitle("Allegiances & Rivalries");
  const { viewer } = useViewer();
  const { data } = useData(async () => {
    const [factions, settings] = await Promise.all([
      must(sb().rpc("get_factions")),
      must(sb().from("admin_settings").select("key, value").in("key", ["allegiance_min_rank", "allegiance_cooldown_days"])),
    ]);
    const s = Object.fromEntries((settings as { key: string; value: unknown }[]).map((r) => [r.key, r.value]));
    return { factions: factions as Faction[], minRank: String(s.allegiance_min_rank ?? "D"), cooldown: Number(s.allegiance_cooldown_days ?? 90) };
  }, []);
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (!data) return <Loading />;

  return (
    <div className="container-eb py-12">
      <PageHeader eyebrow="The World · Allegiances & Rivalries" title="Choose Your Allegiance">
        Every adventurer begins in the Adventurers Guild. As the world darkens, some pledge themselves to rival powers, and the struggle between them decides what Everbound becomes.
      </PageHeader>

      <div className="grid gap-5 md:grid-cols-3">
        {data.factions.map((f) => {
          const tone = FACTION_TONE[f.color];
          return (
            <article key={f.id} className={`reveal panel flex flex-col items-center text-center sm:p-7 ${tone.border} ${tone.ring}`}>
              <span className={`flex h-20 w-20 rotate-45 items-center justify-center border-2 ${tone.border} ${tone.bg}`}>
                <span className={`-rotate-45 ${tone.text}`}><FactionSigil slug={f.slug} className="h-11 w-11" /></span>
              </span>
              <h2 className="heading mt-6 text-2xl">{f.name}</h2>
              <p className={`mt-1 font-ui text-[13px] font-bold uppercase tracking-[0.25em] ${tone.text}`}>{f.motto}</p>
              <p className="mt-3 flex-1 text-[15px] text-parchment/85">{f.description}</p>
              <dl className="mt-5 grid w-full grid-cols-3 gap-2 border-t border-white/10 pt-4 text-sm">
                <div><dt className="muted text-xs uppercase tracking-wider">Members</dt><dd className="font-display text-xl text-parchment">{f.members}</dd></div>
                <div><dt className="muted text-xs uppercase tracking-wider">PvP</dt><dd className="font-display text-xl text-parchment">{f.pvp_members}</dd></div>
                <div><dt className="muted text-xs uppercase tracking-wider">In raids</dt><dd className={`font-display text-base leading-7 ${tone.text}`}>{RAID_SIDE_LABEL[f.raid_side]}</dd></div>
              </dl>
              {f.is_default && <p className="muted mt-3 text-xs">Everyone starts here.</p>}
            </article>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Pledge your allegiance", `From guild rank ${data.minRank}, pledge to any allegiance on your Allegiance page. Nobody is ever forced to switch.`],
          ["Fight for your side", "Your side's victories in contested quests and raids push the shared world in its direction."],
          ["Choose carefully", `After changing sides you must wait ${data.cooldown} days before changing again, so loyalty means something.`],
        ].map(([t, d], i) => (
          <div key={t} className="panel flex gap-4">
            <span className="font-display text-3xl text-gold-light">{["I", "II", "III"][i]}</span>
            <div><h3 className="font-display text-lg text-parchment">{t}</h3><p className="muted mt-1 text-sm">{d}</p></div>
          </div>
        ))}
      </div>

      <section className="mt-16">
        <SectionHeading eyebrow="Party vs party" title="Rivalries at the Table">
          Opted-in adventurers can meet each other as rivals. Look for the PvP tag on the Quest Board.
        </SectionHeading>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <ol className="grid gap-4">
            {MODES.map(([t, d], i) => (
              <li key={t} className="panel flex gap-4">
                <span className="flex h-11 w-11 shrink-0 rotate-45 items-center justify-center border border-gold/60 bg-midnight"><span className="-rotate-45 font-display text-lg text-gold-light">{i + 1}</span></span>
                <div><h3 className="font-display text-xl text-gold-light">{t}</h3><p className="mt-1 text-[15px] text-parchment/85">{d}</p></div>
              </li>
            ))}
          </ol>
          <SystemWindow title="The Crimson Wyrm Raid">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-4 text-center sm:gap-4">
              <div className="text-gold-light"><FactionSigil slug="adventurers-guild" className="mx-auto h-14 w-14" /><p className="mt-2 font-display text-lg">Guild raiders</p><p className="muted text-xs">break the seal</p></div>
              <div className="text-ember"><svg viewBox="0 0 48 48" className="mx-auto h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M4 24 C12 12 36 12 44 24 C36 36 12 36 4 24 Z" /><path d="M24 15 C27 19 27 29 24 33 C21 29 21 19 24 15 Z" fill="currentColor" /><path d="M2 14 L8 18 M46 14 L40 18 M2 34 L8 30 M46 34 L40 30" /></svg><p className="mt-2 font-display text-lg text-parchment">The Wyrm</p><p className="muted text-xs">the prize</p></div>
              <div className="text-ember-light"><FactionSigil slug="ashen-covenant" className="mx-auto h-14 w-14 opacity-80" /><p className="mt-2 font-display text-lg">Covenant defenders</p><p className="muted text-xs">guard the Wyrm</p></div>
            </div>
            <p className="border-t border-white/10 pt-3 text-center text-sm text-arcane-light">Free Companies choose a side when they sign up.</p>
          </SystemWindow>
        </div>
      </section>

      <section className="mt-12 panel sm:p-8">
        <h2 className="heading text-2xl">Safeguards</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {SAFEGUARDS.map((t) => <li key={t} className="flex gap-2 text-[15px] text-parchment/90"><span className="text-arcane">◆</span>{t}</li>)}
        </ul>
        <p className="muted mt-4 text-sm">Read the full <Link className="link" href="/conduct/">Code of Conduct</Link>.</p>
      </section>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {viewer?.character ? <Link href="/portal/allegiance/" className="btn-gold">Your allegiance</Link> : <Link href="/join/" className="btn-gold">How to Join</Link>}
        <Link href="/quests/" className="btn-ghost">Quest Board</Link>
        <Link href="/raids/" className="btn-ghost">Raid Center</Link>
      </div>
    </div>
  );
}
