"use client";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { sb, must } from "@/lib/supabase";
import { questBoard } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { Loading } from "@/components/Guard";
import { QuestCard } from "@/components/QuestCard";
import { Crest } from "@/components/Crest";
import { CTA, StatusPill } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { CHRONICLE_LABEL, shortDate } from "@/lib/format";
import type { ChroniclePost, PublicRaid } from "@/lib/types";

const STEPS = [
  ["Obtain guild card", "Pick up your physical guild card at the store. Its QR code binds it to you."],
  ["Register character", "Create your adventurer in minutes. No hundred-page rulebook required."],
  ["Accept quests", "Reserve a seat at any hosted adventure that fits your schedule."],
  ["Play adventures", "Three-hour tabletop sessions led by a Guild Master."],
  ["Earn renown", "Gold, XP, loot and renown are recorded to your permanent profile."],
  ["Change the world", "Every party's choices shape the shared world for everyone."],
];

export default function Home() {
  const { data } = useData(async () => {
    const [stats, quests, posts, raids] = await Promise.all([
      must(sb().rpc("get_guild_stats")),
      questBoard(),
      must(sb().from("chronicle_posts").select("*").eq("published", true).order("is_featured", { ascending: false }).order("published_at", { ascending: false }).limit(4)),
      must(sb().rpc("get_raids_public")),
    ]);
    return { stats: stats as { adventurers: number; open_quests: number; world_events: number }, quests, posts, raids };
  }, []);
  if (!isSupabaseConfigured) return <Hero stats={null} />;
  if (!data) return (<><Hero stats={{ adventurers: 0, open_quests: 0, world_events: 0 }} /><Loading /></>);
  const { stats, quests, posts, raids } = data;
  const [featured, ...recent] = (posts ?? []) as ChroniclePost[];
  const raid = ((raids ?? []) as PublicRaid[])[0];

  return (
    <>
      <Hero stats={stats} />

      {featured && (
        <section className="container-eb -mt-10 relative z-10">
          <Link href={`/story/?s=${featured.slug}`} className="panel-arcane arcane-shimmer block sm:p-8">
            <p className="eyebrow">The world is changing · {CHRONICLE_LABEL[featured.category]}</p>
            <h2 className="heading mt-2 text-2xl sm:text-3xl">{featured.title}</h2>
            <p className="muted mt-2 max-w-3xl">{featured.excerpt}</p>
          </Link>
        </section>
      )}

      <section className="container-eb mt-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="eyebrow">Guild Quest Board</p>
            <h2 className="heading mt-1 text-2xl sm:text-3xl">Available contracts</h2>
          </div>
          <Link href="/quests" className="link text-sm">All quests →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quests.slice(0, 3).map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      </section>

      <section className="container-eb mt-16">
        <p className="eyebrow text-center">How it works</p>
        <h2 className="heading mt-1 text-center text-2xl sm:text-3xl">The core experience</h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="panel flex gap-4">
              <span className="font-display text-3xl font-bold text-gold/70">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block font-display text-lg text-gold-light">{t}</span>
                <span className="muted text-sm">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-6 text-center">
          <CTA href="/how-it-works" variant="ghost">Read the Guild handbook</CTA>
        </div>
      </section>

      <section className="container-eb mt-16 grid gap-6 lg:grid-cols-5">
        {raid && (
          <Link href="/raids" className="panel lg:col-span-2 flex flex-col items-center justify-center text-center sm:p-8">
            <p className="eyebrow">Raid Center</p>
            <Crest className="rune-pulse my-4 h-20 w-20" glow />
            <h3 className="heading text-2xl">{raid.name}</h3>
            <p className="muted mt-2 text-sm">{raid.display_text}</p>
            {raid.progress !== null && raid.target !== null && (
              <p className="mt-3 font-display text-lg text-arcane-light">Ancient Seal {raid.progress} / {raid.target}</p>
            )}
            <span className="mt-3"><StatusPill status={raid.state === "dormant" || raid.state === "foreshadowed" ? "locked" : "open"} label={raid.state} /></span>
          </Link>
        )}
        <div className={raid ? "lg:col-span-3" : "lg:col-span-5"}>
          <div className="mb-4 flex items-end justify-between">
            <h3 className="heading text-2xl">News from the Realm</h3>
            <Link href="/chronicle" className="link text-sm">The Chronicle →</Link>
          </div>
          <div className="grid gap-3">
            {recent.map((p) => (
              <Link key={p.id} href={`/story/?s=${p.slug}`} className="panel block hover:border-gold/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="eyebrow">{CHRONICLE_LABEL[p.category]}</span>
                  {p.published_at && <span className="muted">{shortDate(p.published_at)}</span>}
                </div>
                <p className="mt-1 font-display text-lg text-gold-light">{p.title}</p>
                <p className="muted line-clamp-2 text-sm">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-eb mt-16">
        <div className="parchment-card p-8 text-center sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-forest">Founding Guild · Pilot season</p>
          <h2 className="mt-2 font-display text-3xl font-bold">The world does not wait for heroes.</h2>
          <p className="mx-auto mt-3 max-w-xl text-midnight/75">Register today and you will carry the title Founding Adventurer for as long as the Guild stands.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/join" className="btn bg-midnight text-gold-light hover:bg-midnight-800">Join the Guild</Link>
            <Link href="/calendar" className="btn border border-midnight/40 text-midnight hover:bg-midnight/5">See the calendar</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Hero({ stats }: { stats: { adventurers: number; open_quests: number; world_events: number } | null }) {
  const pad = (n: number) => String(n).padStart(3, "0");
  return (
    <section className="relative overflow-hidden border-b border-gold/20">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,170,90,.18),transparent_60%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-midnight-950 to-transparent" />
      <div className="container-eb relative py-20 text-center sm:py-28">
        <Crest className="mx-auto h-20 w-20" glow />
        <p className="eyebrow mt-6">Everbound · The Living Adventurers Guild</p>
        <h1 className="heading mx-auto mt-4 max-w-3xl text-4xl font-bold sm:text-6xl">Your Legend Begins Here</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-parchment/80">The world does not wait for heroes. Join the Guild. Accept your calling. Leave your mark.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CTA href="/join">Join the Guild</CTA>
          <CTA href="/quests" variant="ghost">Explore Quests</CTA>
        </div>
        {stats ? (
          <dl className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-4">
            {[["Adventurers", stats.adventurers], ["Open Quests", stats.open_quests], ["World Events", stats.world_events]].map(([l, v]) => (
              <div key={l as string}>
                <dd className="font-display text-3xl font-bold text-gold-light sm:text-4xl">{pad(v as number)}</dd>
                <dt className="mt-1 text-[10px] uppercase tracking-[0.25em] text-parchment/60">{l}</dt>
              </div>
            ))}
          </dl>
        ) : (
          <SetupNotice />
        )}
      </div>
    </section>
  );
}
