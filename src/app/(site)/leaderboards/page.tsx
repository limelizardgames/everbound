import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Empty, PageHeader, RankBadge, sp, type SP } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";

export const metadata = { title: "Hall of Legends" };
export const dynamic = "force-dynamic";

const METRICS = { renown: "Renown", quests: "Quests", discoveries: "Discoveries", achievements: "Achievements" } as const;

export default async function Leaderboards({ searchParams }: { searchParams: SP }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const q = await searchParams;
  const metric = (sp(q.metric) ?? "renown") as keyof typeof METRICS;
  const scope = sp(q.scope) === "all" ? "all" : "season";
  const supabase = await createClient();
  const [{ data }, { data: season }] = await Promise.all([
    supabase.rpc("get_leaderboard", { p_metric: metric in METRICS ? metric : "renown", p_scope: scope, p_limit: 50 }),
    supabase.from("admin_settings").select("value").eq("key", "season_name").maybeSingle(),
  ]);
  const rows = (data ?? []) as { place: number; character_name: string; card_number: string | null; species: string; class: string; rank_code: string; value: number }[];
  const link = (m: string, s: string) => `/leaderboards?metric=${m}&scope=${s}`;
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
      {rows.length === 0 ? (
        <Empty title="No legends yet">The first adventurers to complete a quest will be inscribed here.</Empty>
      ) : (
        <ol className="grid gap-2">
          {rows.map((r) => (
            <li key={`${r.place}-${r.character_name}`} className={`flex items-center gap-4 rounded-xl border p-3 sm:p-4 ${r.place <= 3 ? "border-gold/50 bg-gold/5" : "border-midnight-600 bg-midnight-900/60"}`}>
              <span className={`w-10 text-center font-display text-2xl font-bold ${r.place === 1 ? "text-gold" : r.place <= 3 ? "text-gold-light" : "text-parchment/50"}`}>#{r.place}</span>
              <RankBadge code={r.rank_code} size="sm" />
              <span className="flex-1">
                {r.card_number ? <Link href={`/adventurers/${r.card_number}`} className="font-display text-lg text-parchment hover:text-gold-light">{r.character_name}</Link> : <span className="font-display text-lg">{r.character_name}</span>}
                <span className="muted block text-xs capitalize">{r.species.replace("_", " ")} · {r.class}</span>
              </span>
              <span className="font-display text-xl text-gold-light">{Number(r.value).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
