"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { abandonExpedition, claimExpedition, solveRiddle, startExpedition } from "@/lib/actions";
import { Empty, PageHeader, RankBadge, StatusPill, SystemWindow } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";

type Errand = { id: string; slug: string; title: string; kind: "expedition" | "riddle"; description: string; min_rank: string; duration_minutes: number | null; gold_reward: number; location: { name: string; slug: string } | null; rewards: { qty_min: number; qty_max: number; chance: number; item: { name: string; rarity: string } }[] };
type Run = { id: string; errand_id: string; status: string; started_at: string; ready_at: string; claimed_at: string | null };
const RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS"];

export default function Page() {
  return <Suspense fallback={<Loading />}><Errands /></Suspense>;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}
const fmtDur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
function left(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

function Errands() {
  useTitle("Guild Errands");
  const tab = useSearchParams().get("tab") === "riddles" ? "riddles" : "expeditions";
  const { viewer, refresh } = useViewer();
  const act = useAct();
  const now = useNow();
  const c = viewer?.character;
  const { data, reload } = useData(async () => {
    const [errands, runs, settings] = await Promise.all([
      must(sb().from("errands").select("id, slug, title, kind, description, min_rank, duration_minutes, gold_reward, location:locations(name, slug), rewards:errand_rewards(qty_min, qty_max, chance, item:items(name, rarity))").eq("is_active", true).order("sort")),
      must(sb().from("errand_runs").select("id, errand_id, status, started_at, ready_at, claimed_at").eq("character_id", c!.id).order("started_at", { ascending: false }).limit(200)),
      must(sb().from("admin_settings").select("key, value").in("key", ["expedition_slots", "errand_daily_cap"])),
    ]);
    const set = Object.fromEntries((settings as { key: string; value: unknown }[]).map((s) => [s.key, Number(s.value)]));
    return { errands: errands as unknown as Errand[], runs: runs as Run[], slots: set.expedition_slots || 2, cap: set.errand_daily_cap || 8 };
  }, [c?.id], !!c);
  if (!viewer) return null;
  if (!c) return <Empty title="Register an adventurer first" action={<Link className="btn-gold" href="/portal/character/new/">Create adventurer</Link>} />;
  if (!data) return <Loading />;
  const after = { after: async () => { await reload(); await refresh(); } };
  const rankIdx = RANKS.indexOf(viewer.totals?.rank_code ?? "F");
  const running = data.runs.filter((r) => r.status === "running");
  const today = data.runs.filter((r) => r.claimed_at && now - new Date(r.claimed_at).getTime() < 86400000).length;
  const solved = new Set(data.runs.filter((r) => r.status === "solved").map((r) => r.errand_id));
  const byId = new Map(data.errands.map((e) => [e.id, e]));
  const list = data.errands.filter((e) => e.kind === (tab === "riddles" ? "riddle" : "expedition"));

  return (
    <div>
      <PageHeader eyebrow="Mini-quests · play from home" title="Guild Errands" action={<span className="hud-num rounded-sm border border-arcane/40 bg-arcane/10 px-3 py-1.5 text-arcane-light">{today} / {data.cap} today</span>}>
        Send your adventurer on expeditions and solve the Guild&apos;s riddles between sessions. Errands pay materials and a little gold — rank and experience are still earned at the table.
      </PageHeader>

      <SystemWindow title="Active Expeditions" right={<span className="hud-num text-[13px] uppercase tracking-[0.2em] text-parchment/60">{running.length} / {data.slots} slots</span>} className="mb-8">
        {running.length === 0 ? <p className="muted text-sm">No one is out on the road. Choose an expedition below.</p> : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {running.map((r) => {
              const e = byId.get(r.errand_id);
              const total = new Date(r.ready_at).getTime() - new Date(r.started_at).getTime();
              const remain = new Date(r.ready_at).getTime() - now;
              const pct = Math.min(100, Math.max(0, ((total - remain) / total) * 100));
              const ready = remain <= 0;
              return (
                <li key={r.id} className="rounded-sm border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-2"><p className="font-display text-lg text-gold-light">{e?.title ?? "Expedition"}</p>{ready ? <StatusPill status="confirmed" label="Returned" /> : <span className="hud-num text-arcane-light">{left(remain)}</span>}</div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-sm border border-white/10 bg-midnight-950"><div className="bar-fill h-full" style={{ width: `${pct}%`, background: ready ? "linear-gradient(90deg,#1f7a52,#4ade80)" : "linear-gradient(90deg,#2b8fa5,#8fe3f2)" }} /></div>
                  <div className="mt-3 flex gap-2">
                    {ready ? (
                      <form action={act(() => claimExpedition(r.id), after)} className="flex-1"><SubmitButton className="btn-gold btn-sm w-full" pendingText="Unpacking…">▸ Collect haul</SubmitButton></form>
                    ) : (
                      <form action={act(() => abandonExpedition(r.id), after)}><SubmitButton className="btn-danger btn-sm" confirm="Recall this expedition? You will get nothing back.">Recall</SubmitButton></form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SystemWindow>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/portal/errands/" className={`btn-sm ${tab === "expeditions" ? "btn-gold" : "btn-ghost"}`}>Expeditions</Link>
        <Link href="/portal/errands/?tab=riddles" className={`btn-sm ${tab === "riddles" ? "btn-gold" : "btn-ghost"}`}>Riddles · {data.errands.filter((e) => e.kind === "riddle" && !solved.has(e.id)).length} unsolved</Link>
        <Link href="/portal/workshop/" className="btn-arcane btn-sm">Workshop ▸</Link>
      </div>

      {list.length === 0 ? <Empty title="Nothing posted yet" /> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => {
            const locked = RANKS.indexOf(e.min_rank) > rankIdx;
            const isRunning = running.some((r) => r.errand_id === e.id);
            const done = solved.has(e.id);
            return (
              <li key={e.id} className={`panel flex flex-col ${locked || done ? "opacity-70" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-ui text-[12px] font-bold uppercase tracking-[0.2em] text-arcane-light/80">{e.kind === "riddle" ? "Riddle" : `Expedition · ${fmtDur(e.duration_minutes ?? 0)}`}</span>
                  <RankBadge code={e.min_rank} size="sm" />
                </div>
                <h2 className="mt-1 font-display text-xl text-gold-light">{e.title}</h2>
                {e.location && <Link href={`/place/?s=${e.location.slug}`} className="font-ui text-[12px] font-semibold uppercase tracking-[0.14em] text-parchment/55 hover:text-gold-light">◆ {e.location.name}</Link>}
                <p className={`mt-2 flex-1 text-sm ${e.kind === "riddle" ? "font-display italic text-parchment" : "muted"}`}>{e.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {e.rewards.map((r, i) => (
                    <span key={i} className={`rounded-sm border border-white/10 bg-white/[0.04] px-2 py-0.5 font-ui text-[12px] font-bold uppercase tracking-wider rarity-${r.item.rarity}`}>
                      {r.qty_min === r.qty_max ? r.qty_min : `${r.qty_min}–${r.qty_max}`}× {r.item.name}{r.chance < 1 ? ` · ${Math.round(r.chance * 100)}%` : ""}
                    </span>
                  ))}
                  {e.gold_reward > 0 && <span className="rounded-sm border border-gold/40 bg-gold/10 px-2 py-0.5 font-ui text-[12px] font-bold uppercase tracking-wider text-gold-light">{e.gold_reward} G</span>}
                </div>
                <div className="mt-4 border-t border-white/10 pt-3">
                  {locked ? <p className="font-ui text-[13px] font-semibold uppercase tracking-wider text-parchment/60">Unlocks at Rank {e.min_rank}</p>
                    : e.kind === "riddle" ? (done ? <StatusPill status="confirmed" label="Solved" /> : (
                      <form action={act((fd) => solveRiddle(c.id, e.id, String(fd.get("answer") ?? "")), after)} className="flex gap-2">
                        <label className="sr-only" htmlFor={`ans-${e.id}`}>Your answer</label>
                        <input id={`ans-${e.id}`} name="answer" className="input min-h-[36px] py-1" placeholder="Your answer" required maxLength={100} autoComplete="off" />
                        <SubmitButton className="btn-gold btn-sm" pendingText="…">Answer</SubmitButton>
                      </form>
                    ))
                    : isRunning ? <StatusPill status="unassigned" label="On this expedition" />
                    : running.length >= data.slots ? <p className="font-ui text-[13px] font-semibold uppercase tracking-wider text-parchment/60">All slots busy</p>
                    : <form action={act(() => startExpedition(c.id, e.id), after)}><SubmitButton className="btn-gold btn-sm w-full" pendingText="Packing…">▸ Send adventurer</SubmitButton></form>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {tab === "riddles" && <p className="muted mt-6 text-sm">Stuck? Every answer is hidden somewhere in <Link className="link" href="/chronicle/">the Chronicle</Link>, the <Link className="link" href="/quests/">Quest Board</Link> or the <Link className="link" href="/world/">World Atlas</Link>.</p>}
    </div>
  );
}
