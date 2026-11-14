"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { pledgeAllegiance, setPvpOptIn } from "@/lib/actions";
import { Empty, PageHeader, RankBadge, SystemWindow } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { FactionSigil, FACTION_TONE, RAID_SIDE_LABEL } from "@/components/FactionSigil";
import { dateTime } from "@/lib/format";
import type { Faction } from "@/lib/types";

const RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS"];
type Change = { created_at: string; note: string | null; from: { name: string } | null; to: { name: string } | null };

export default function AllegiancePage() {
  useTitle("Allegiance");
  const { viewer, refresh } = useViewer();
  const act = useAct();
  const c = viewer?.character;
  const { data, reload } = useData(async () => {
    if (!c) return null;
    const [factions, settings, changes] = await Promise.all([
      must(sb().rpc("get_factions")),
      must(sb().from("admin_settings").select("key, value").in("key", ["allegiance_min_rank", "allegiance_cooldown_days"])),
      must(sb().from("allegiance_changes").select("created_at, note, from:from_faction(name), to:to_faction(name)").eq("character_id", c.id).order("created_at", { ascending: false }).limit(10)),
    ]);
    const s = Object.fromEntries((settings as { key: string; value: unknown }[]).map((r) => [r.key, r.value]));
    return { factions: factions as Faction[], minRank: String(s.allegiance_min_rank ?? "D"), cooldown: Number(s.allegiance_cooldown_days ?? 90), changes: changes as unknown as Change[] };
  }, [c?.id, c?.faction_id, c?.pvp_opt_in]);

  if (!viewer) return <Loading />;
  if (!c) return <Empty title="No adventurer yet" action={<Link href="/portal/character/new/" className="btn-gold">Create your adventurer</Link>}>Create your adventurer first, then choose where your loyalty lies.</Empty>;
  if (!data) return <Loading />;

  const current = data.factions.find((f) => f.id === c.faction_id) ?? data.factions.find((f) => f.is_default)!;
  const tone = FACTION_TONE[current.color];
  const rank = viewer.totals?.rank_code ?? "F";
  const rankOk = RANKS.indexOf(rank) >= RANKS.indexOf(data.minRank);
  const nextChange = c.faction_changed_at ? new Date(new Date(c.faction_changed_at).getTime() + data.cooldown * 86400000) : null;
  const coolingDown = nextChange !== null && nextChange.getTime() > Date.now();
  const after = { after: async () => { await refresh(); await reload(); } };

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Adventurer Portal" title="Allegiance & PvP">
        Where does {c.name}&apos;s loyalty lie? Your allegiance decides your side in contested quests and two-sided raids. <Link className="link" href="/allegiances/">How allegiances work</Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className={`panel flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left ${tone.border} ${tone.ring}`}>
          <span className={`flex h-24 w-24 shrink-0 rotate-45 items-center justify-center border-2 ${tone.border} ${tone.bg}`}>
            <span className={`-rotate-45 ${tone.text}`}><FactionSigil slug={current.slug} className="h-12 w-12" /></span>
          </span>
          <div>
            <p className="eyebrow">You serve</p>
            <h2 className="heading text-3xl">{current.name}</h2>
            <p className={`font-ui text-[13px] font-bold uppercase tracking-[0.25em] ${tone.text}`}>{current.motto}</p>
            <p className="muted mt-2 text-sm">In two-sided raids: <strong className="text-parchment">{RAID_SIDE_LABEL[current.raid_side]}</strong>{current.raid_side === "either" ? " (you choose when you sign up)" : ""}</p>
            {coolingDown && <p className="mt-1 text-sm text-gold-light">You can change allegiance again on {dateTime(nextChange!.toISOString())}.</p>}
          </div>
        </section>

        <SystemWindow title="Player vs Player">
          <p className="text-[15px] text-parchment/90">
            PvP is <strong className={c.pvp_opt_in ? "text-emerald-300" : "text-parchment"}>{c.pvp_opt_in ? "ON" : "OFF"}</strong> for {c.name}.
          </p>
          <p className="muted mt-2 text-sm">
            With PvP on you can book party-vs-party quests and sign up for two-sided raids. A Guild Master referees every clash, and the Code of Conduct always applies.
          </p>
          <form action={act(() => setPvpOptIn(c.id, !c.pvp_opt_in), after)} className="mt-4">
            <SubmitButton className={c.pvp_opt_in ? "btn-ghost" : "btn-gold"}>{c.pvp_opt_in ? "Turn PvP off" : "Turn PvP on"}</SubmitButton>
          </form>
        </SystemWindow>
      </div>

      <section>
        <h2 className="heading mb-3 text-2xl">Pledge your allegiance</h2>
        {!rankOk && (
          <p className="mb-4 rounded-sm border border-gold/40 bg-gold/5 p-3 text-sm">
            Other allegiances open at guild rank <RankBadge code={data.minRank} size="sm" />. You are rank <RankBadge code={rank} size="sm" />. Keep adventuring!
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {data.factions.map((f) => {
            const t = FACTION_TONE[f.color];
            const mine = f.id === current.id;
            const blocked = mine ? "Your current allegiance" : coolingDown ? "Changed recently" : !f.is_default && !rankOk ? `Opens at rank ${data.minRank}` : null;
            return (
              <article key={f.id} className={`panel flex flex-col ${mine ? `${t.border} ${t.ring}` : ""}`}>
                <div className="flex items-center gap-3">
                  <span className={t.text}><FactionSigil slug={f.slug} className="h-10 w-10" /></span>
                  <div><h3 className="font-display text-lg leading-tight text-parchment">{f.name}</h3><p className={`font-ui text-[11px] font-bold uppercase tracking-[0.2em] ${t.text}`}>{f.motto}</p></div>
                </div>
                <p className="muted mt-3 flex-1 text-sm">{f.description}</p>
                <p className="mt-3 text-xs text-parchment/60">{f.members} members · {f.pvp_members} with PvP on</p>
                <div className="mt-4">
                  {blocked ? (
                    <span className="inline-block rounded-sm border border-white/15 px-3 py-2 text-sm text-parchment/60">{blocked}</span>
                  ) : (
                    <form action={act(() => pledgeAllegiance(c.id, f.id), after)} onSubmit={(e) => { if (!confirm(`Pledge ${c.name} to ${f.name}? You won't be able to change again for ${data.cooldown} days.`)) e.preventDefault(); }}>
                      <SubmitButton pendingText="Pledging…">Pledge to {f.name.replace(/^The /, "")}</SubmitButton>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <p className="muted mt-3 text-xs">You can&apos;t change sides while signed up for a raid or a party-vs-party quest.</p>
      </section>

      {data.changes.length > 0 && (
        <section className="panel">
          <h2 className="font-display text-lg text-gold-light">Allegiance history</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {data.changes.map((h) => (
              <li key={h.created_at} className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-2">
                <span>{h.from?.name ?? data.factions.find((f) => f.is_default)?.name} → <strong className="text-parchment">{h.to?.name}</strong>{h.note ? <span className="muted"> · {h.note}</span> : null}</span>
                <span className="muted">{dateTime(h.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
