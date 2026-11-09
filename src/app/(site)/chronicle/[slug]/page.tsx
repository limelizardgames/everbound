import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/SetupNotice";
import { CHRONICLE_LABEL, longDay } from "@/lib/format";
import type { ChroniclePost } from "@/lib/types";

export default async function ChroniclePost({ params }: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("chronicle_posts").select("*, location:locations(name, slug)").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const p = data as ChroniclePost & { location: { name: string; slug: string } | null };
  return (
    <div className="container-eb max-w-3xl py-12">
      <Link href="/chronicle" className="link text-sm">← The Chronicle</Link>
      <article className="parchment-card mt-4 p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-forest">{CHRONICLE_LABEL[p.category]}{p.published_at ? ` · ${longDay(p.published_at)}` : ""}</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{p.title}</h1>
        <p className="mt-4 text-lg italic text-midnight/80">{p.excerpt}</p>
        <div className="mt-6 whitespace-pre-line leading-relaxed text-midnight/90">{p.body}</div>
        {p.location && <p className="mt-8 text-sm">Location: <Link className="font-semibold text-forest underline" href={`/world/${p.location.slug}`}>{p.location.name}</Link></p>}
      </article>
    </div>
  );
}
