"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/env";
import { useData } from "@/lib/useData";
import { Empty, StatusPill } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";
import { CHRONICLE_LABEL, shortDate } from "@/lib/format";
import type { ChroniclePost, Location, QuestTemplate } from "@/lib/types";

export default function Page() {
  return <Suspense fallback={<Loading />}><LocationPage /></Suspense>;
}

function LocationPage() {
  const slug = useSearchParams().get("s") ?? "";
  const { data, loading } = useData(async () => {
    const loc = (await must(sb().from("locations").select("*").eq("slug", slug).maybeSingle())) as Location | null;
    if (!loc) return null;
    const [quests, posts] = await Promise.all([
      must(sb().from("quest_templates").select("*").eq("location_id", loc.id).in("status", ["published", "locked"])),
      must(sb().from("chronicle_posts").select("*").eq("location_id", loc.id).eq("published", true).order("published_at", { ascending: false }).limit(5)),
    ]);
    return { loc, quests: quests as QuestTemplate[], posts: posts as ChroniclePost[] };
  }, [slug]);
  useTitle(data?.loc.name ?? "The World");
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading) return <Loading />;
  if (!data) return <div className="container-eb py-12"><Empty title="This place is not on the Guild's maps" action={<Link className="btn-ghost" href="/world/">Atlas</Link>} /></div>;
  const { loc, quests, posts } = data;
  return (
    <div className="container-eb max-w-4xl py-12">
      <Link href="/world/" className="link text-sm">← Atlas</Link>
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
      {quests.length > 0 && (
        <section className="mt-8">
          <h2 className="heading text-xl">Quests here</h2>
          <ul className="mt-3 grid gap-2">
            {quests.map((q) => (
              <li key={q.id}><Link className="panel flex justify-between hover:border-gold/60" href={`/quest/?s=${q.slug}`}><span>{q.title}</span><span className="muted text-sm">Rank {q.rank_min}–{q.rank_max}</span></Link></li>
            ))}
          </ul>
        </section>
      )}
      {posts.length > 0 && (
        <section className="mt-8">
          <h2 className="heading text-xl">From the Chronicle</h2>
          <ul className="mt-3 grid gap-2">
            {posts.map((p) => (
              <li key={p.id}><Link className="panel block hover:border-gold/60" href={`/story/?s=${p.slug}`}><span className="eyebrow">{CHRONICLE_LABEL[p.category]} · {p.published_at && shortDate(p.published_at)}</span><span className="mt-1 block font-display text-gold-light">{p.title}</span></Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
