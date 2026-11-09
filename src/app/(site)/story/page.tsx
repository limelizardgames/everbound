"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/env";
import { useData } from "@/lib/useData";
import { Empty } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";
import { CHRONICLE_LABEL, longDay } from "@/lib/format";
import type { ChroniclePost } from "@/lib/types";

export default function Page() {
  return <Suspense fallback={<Loading />}><Story /></Suspense>;
}

function Story() {
  const slug = useSearchParams().get("s") ?? "";
  const { data: p, loading } = useData(async () =>
    (await must(sb().from("chronicle_posts").select("*, location:locations(name, slug)").eq("slug", slug).maybeSingle())) as (ChroniclePost & { location: { name: string; slug: string } | null }) | null, [slug]);
  useTitle(p?.title ?? "The Chronicle");
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading) return <Loading />;
  if (!p) return <div className="container-eb py-12"><Empty title="This dispatch could not be found" action={<Link className="btn-ghost" href="/chronicle/">The Chronicle</Link>} /></div>;
  return (
    <div className="container-eb max-w-3xl py-12">
      <Link href="/chronicle/" className="link text-sm">← The Chronicle</Link>
      <article className="parchment-card mt-4 p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-forest">{CHRONICLE_LABEL[p.category]}{p.published_at ? ` · ${longDay(p.published_at)}` : ""}</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{p.title}</h1>
        <p className="mt-4 text-lg italic text-midnight/80">{p.excerpt}</p>
        <div className="mt-6 whitespace-pre-line leading-relaxed text-midnight/90">{p.body}</div>
        {p.location && <p className="mt-8 text-sm">Location: <Link className="font-semibold text-forest underline" href={`/place/?s=${p.location.slug}`}>{p.location.name}</Link></p>}
      </article>
    </div>
  );
}
