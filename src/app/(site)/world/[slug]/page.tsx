import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { StatusPill } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { CHRONICLE_LABEL, shortDate } from "@/lib/format";
import type { ChroniclePost, Location, QuestTemplate } from "@/lib/types";

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("locations").select("*").eq("slug", slug).maybeSingle();
  const loc = data as Location | null;
  if (!loc) notFound();
  const [{ data: quests }, { data: posts }] = await Promise.all([
    supabase.from("quest_templates").select("*").eq("location_id", loc.id).in("status", ["published", "locked"]),
    supabase.from("chronicle_posts").select("*").eq("location_id", loc.id).eq("published", true).order("published_at", { ascending: false }).limit(5),
  ]);
  return (
    <div className="container-eb max-w-4xl py-12">
      <Link href="/world" className="link text-sm">← Atlas</Link>
      <div className="panel mt-4 sm:p-8">
        <p className="eyebrow">{loc.region}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="heading text-3xl sm:text-4xl">{loc.name}</h1>
          <StatusPill status={loc.status} />
        </div>
        <p className="mt-4 text-lg text-parchment/85">{loc.summary}</p>
        {loc.lore && <p className="muted mt-4 whitespace-pre-line leading-relaxed">{loc.lore}</p>}
        <dl className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
          {loc.threat && (<><dt className="text-parchment/50">Known threats</dt><dd>{loc.threat}</dd></>)}
          {loc.discovered_by && (<><dt className="text-parchment/50">Discovery credit</dt><dd>{loc.discovered_by}</dd></>)}
        </dl>
      </div>
      {(quests ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="heading text-xl">Quests here</h2>
          <ul className="mt-3 grid gap-2">
            {(quests as QuestTemplate[]).map((q) => (
              <li key={q.id}><Link className="panel flex justify-between hover:border-gold/60" href={`/quests/${q.slug}`}><span>{q.title}</span><span className="muted text-sm">Rank {q.rank_min}–{q.rank_max}</span></Link></li>
            ))}
          </ul>
        </section>
      )}
      {(posts ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="heading text-xl">From the Chronicle</h2>
          <ul className="mt-3 grid gap-2">
            {(posts as ChroniclePost[]).map((p) => (
              <li key={p.id}><Link className="panel block hover:border-gold/60" href={`/chronicle/${p.slug}`}><span className="eyebrow">{CHRONICLE_LABEL[p.category]} · {p.published_at && shortDate(p.published_at)}</span><span className="mt-1 block font-display text-gold-light">{p.title}</span></Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
