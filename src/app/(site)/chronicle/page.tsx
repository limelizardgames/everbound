import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Empty, PageHeader, sp, type SP } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { CHRONICLE_LABEL, shortDate } from "@/lib/format";
import type { ChroniclePost } from "@/lib/types";

export const metadata = { title: "The Everbound Chronicle" };
export const dynamic = "force-dynamic";

export default async function ChroniclePage({ searchParams }: { searchParams: SP }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const cat = sp((await searchParams).category);
  const supabase = await createClient();
  let q = supabase.from("chronicle_posts").select("*").eq("published", true).order("published_at", { ascending: false }).limit(50);
  if (cat) q = q.eq("category", cat);
  const { data } = await q;
  const posts = (data ?? []) as ChroniclePost[];
  const [lead, ...rest] = posts;
  return (
    <div className="container-eb py-12">
      <PageHeader eyebrow="The Everbound Chronicle" title="News From the Realm">World news, adventure outcomes, discoveries, NPC announcements and guild proclamations.</PageHeader>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Categories">
        <Link href="/chronicle" className={`btn-sm ${!cat ? "btn-gold" : "btn-ghost"}`}>All</Link>
        {Object.entries(CHRONICLE_LABEL).map(([k, v]) => (
          <Link key={k} href={`/chronicle?category=${k}`} className={`btn-sm ${cat === k ? "btn-gold" : "btn-ghost"}`}>{v}</Link>
        ))}
      </nav>
      {!lead ? (
        <Empty title="No dispatches yet" />
      ) : (
        <>
          <Link href={`/chronicle/${lead.slug}`} className="parchment-card block p-6 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-forest">{CHRONICLE_LABEL[lead.category]} · {lead.published_at && shortDate(lead.published_at)}</p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{lead.title}</h2>
            <p className="mt-3 max-w-3xl text-midnight/80">{lead.excerpt}</p>
          </Link>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <Link key={p.id} href={`/chronicle/${p.slug}`} className="panel block hover:border-gold/60">
                <p className="eyebrow">{CHRONICLE_LABEL[p.category]}</p>
                <h3 className="mt-2 font-display text-lg text-gold-light">{p.title}</h3>
                <p className="muted mt-1 line-clamp-3 text-sm">{p.excerpt}</p>
                {p.published_at && <p className="mt-3 text-xs text-parchment/50">{shortDate(p.published_at)}</p>}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
