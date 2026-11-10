"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/env";
import { useData } from "@/lib/useData";
import { Empty, PageHeader, RankBadge } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";

const METRICS = { renown: "Renown", quests: "Quests", discoveries: "Discoveries", achievements: "Achievements" } as const;

export default function Page() {
  return <Suspense fallback={<Loading />}><Leaderboards /></Suspense>;
}

function Leaderboards() {
  useTitle("Hall of Legends");
  const params = useSearchParams();
  const metric = (params.get("metric") ?? "renown") as keyof typeof METRICS;
  const scope = params.get("scope") === "all" ? "all" : "season";
  const { data } = useData(async () => {
    const [rows, season] = await Promise.all([
      must(sb().rpc("get_leaderboard", { p_metric: metric in METRICS ? metric : "renown", p_scope: scope, p_limit: 50 })),
      must(sb().from("admin_settings").select("value").eq("key", "season_name").maybeSingle()),
    ]);
    return { rows, season };
  }, [metric, scope]);
  if (!isSupabaseConfigured) return <SetupNotice />;
  const season = data?.season;
  const rows = (data?.rows ?? []) as { place: number; character_name: string; card_number: string | null; species: string; class: string; rank_code: string; value: number }[];
  const link = (m: string, s: string) => `/leaderboards/?metric=${m}&scope=${s}`;
  return (
    <div className="container-eb max-w-4xl py-12">
      <PageHeader eyebrow={scope === "season" ? (season?.value as string) ?? "Current season" : "All-time"} title="Hall of Legends">
        Celebrating every style of adventuring. Repeat runs of a quest never count as new discoveries. Players can opt out in their settings.
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(METRICS).map(([k, v]) => (
          <Link key={k} href={link(k, scope)} className={`btn-sm ${metric === k ? "btn-gold" : "btn-ghost"}`}>{v}</Link>
        ))}
        <span className="mx-2 hidden w-px bg-gold/30 sm:block" />
        <Link href={link(metric, "season")} className={`btn-sm ${scope === "season" ? "btn-arcane" : "btn-ghost"}`}>This season</Link>
        <Link href={link(metric, "all")} className={`btn-sm ${scope === "all" ? "btn-arcane" : "btn-ghost"}`}>All-time</Link>
      </div>
      {!data ? <Loading /> : rows.length === 0 ? (
        <Empty title="No legends yet">The first adventurers to complete a quest will be inscribed here.</Empty>
      ) : (
        <>
          <div className="mb-6 grid items-end gap-3 sm:grid-cols-3">
            {[rows[1], rows[0], rows[2]].map((r, i) => r && (
              <div key={r.character_name} className={`reveal panel text-center ${i === 1 ? "border-gold/60 shadow-gold sm:pb-10 sm:pt-8" : "sm:pb-6"} ${i === 1 ? "order-first sm:order-none" : ""}`}>
                <p className="font-display text-4xl font-bold" style={{ color: ["#C9D1DC", "#F0D79A", "#C08A4A"][i] }}>{["II", "I", "III"][i]}</p>
                <div className="mt-2 flex justify-center"><RankBadge code={r.rank_code} size={i === 1 ? "lg" : "md"} /></div>
                {r.card_number ? <Link href={`/adventurer/?n=${r.card_number}`} className="mt-2 block font-display text-xl text-parchment hover:text-gold-light">{r.character_name}</Link> : <p className="mt-2 font-display text-xl">{r.character_name}</p>}
                <p className="muted font-ui text-[12px] font-semibold uppercase tracking-[0.16em]">{r.species.replace("_", "-")} · {r.class}</p>
                <p className="hud-num mt-2 text-2xl text-gold-light">{Number(r.value).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <ol className="grid gap-2">
            {rows.slice(3).map((r) => (
              <li key={`${r.place}-${r.character_name}`} className="flex items-center gap-4 rounded-sm border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                <span className="hud-num w-10 text-center text-xl text-parchment/50">#{r.place}</span>
                <RankBadge code={r.rank_code} size="sm" />
                <span className="flex-1">
                  {r.card_number ? <Link href={`/adventurer/?n=${r.card_number}`} className="font-display text-lg text-parchment hover:text-gold-light">{r.character_name}</Link> : <span className="font-display text-lg">{r.character_name}</span>}
                  <span className="muted block font-ui text-[12px] font-semibold uppercase tracking-[0.14em]">{r.species.replace("_", "-")} · {r.class}</span>
                </span>
                <span className="hud-num text-xl text-gold-light">{Number(r.value).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
