"use client";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { sb, must } from "@/lib/supabase";
import { questBoard } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { useViewer } from "@/lib/viewer";
import { Loading } from "@/components/Guard";
import { QuestCard } from "@/components/QuestCard";
import { Crest } from "@/components/Crest";
import { MagicCircle } from "@/components/MagicCircle";
import { HeroAtlas } from "@/components/HeroAtlas";
import { StatusPill, SystemWindow } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { CHRONICLE_LABEL, shortDate } from "@/lib/format";
import type { ChroniclePost, PublicRaid } from "@/lib/types";

const STEPS = [
  ["Obtain guild card", "Pick up your physical guild card at the store. Its QR code binds it to you.", "◈"],
  ["Register character", "Create your adventurer in minutes. No hundred-page rulebook required.", "✦"],
  ["Accept quests", "Reserve a seat at any hosted adventure that fits your schedule.", "!"],
  ["Play adventures", "Three-hour tabletop sessions led by a Guild Master.", "⚔"],
  ["Earn renown", "Gold, XP, loot and renown are recorded to your permanent profile.", "★"],
  ["Change the world", "Every party's choices shape the shared world for everyone.", "◎"],
];

type Stats = { adventurers: number; open_quests: number; world_events: number };

export default function Home() {
  const { data } = useData(async () => {
    const [stats, quests, posts, raids] = await Promise.all([
      must(sb().rpc("get_guild_stats")),
      questBoard(),
      must(sb().from("chronicle_posts").select("*").eq("published", true).order("is_featured", { ascending: false }).order("published_at", { ascending: false }).limit(4)),
      must(sb().rpc("get_raids_public")),
    ]);
    return { stats: stats as Stats, quests, posts: posts as ChroniclePost[], raids: raids as PublicRaid[] };
  }, []);
  if (!isSupabaseConfigured) return <Hero stats={null} />;
  if (!data) return (<><Hero stats={{ adventurers: 0, open_quests: 0, world_events: 0 }} /><Loading /></>);
  const { stats, quests, posts, raids } = data;
  const [featured, ...recent] = posts;
  const raid = raids[0];

  return (
    <>
      <Hero stats={stats} />

      {featured && (
        <section className="container-eb relative z-10 -mt-14">
          <Link href={`/story/?s=${featured.slug}`} className="block transition hover:-translate-y-0.5">
            <SystemWindow title="World Event" right={<span className="font-ui text-[12px] font-bold uppercase tracking-[0.2em] text-ember-light">⚠ Alert</span>}>
              <p className="eyebrow">The world is changing · {CHRONICLE_LABEL[featured.category]}</p>
              <h2 className="heading mt-2 text-2xl sm:text-3xl">{featured.title}</h2>
              <p className="muted mt-2 max-w-3xl">{featured.excerpt}</p>
            </SystemWindow>
          </Link>
        </section>
      )}

      <section className="container-eb mt-20">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="eyebrow">Guild Quest Board</p>
            <h2 className="heading mt-1 text-2xl sm:text-3xl">Available Contracts</h2>
          </div>
          <Link href="/quests/" className="link font-ui text-sm font-semibold uppercase tracking-[0.14em]">All quests ▸</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quests.slice(0, 3).map((q) => <QuestCard key={q.id} quest={q} />)}
        </div>
      </section>

      <section className="container-eb mt-20">
        <p className="eyebrow text-center">Tutorial</p>
        <h2 className="heading mt-1 text-center text-2xl sm:text-3xl">Your First Steps in Everbound</h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([t, d, icon], i) => (
            <li key={t} className="panel flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-arcane/50 bg-arcane/10 font-display text-xl text-arcane-light shadow-glow" style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}>
                {icon}
              </span>
              <span>
                <span className="block font-ui text-[12px] font-bold uppercase tracking-[0.24em] text-arcane/80">Step {String(i + 1).padStart(2, "0")}</span>
                <span className="block font-display text-lg text-gold-light">{t}</span>
                <span className="muted text-sm">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-6 text-center"><Link href="/how-it-works/" className="btn-ghost">Read the Guild Handbook</Link></div>
      </section>

      <section className="container-eb mt-20 grid gap-6 lg:grid-cols-5">
        {raid && (
          <Link href="/raids/" className="panel relative overflow-hidden text-center lg:col-span-2 sm:p-8">
            <div className="relative mx-auto h-48 w-48">
              <MagicCircle className="absolute inset-0" tone={raid.state === "dormant" || raid.state === "foreshadowed" ? "#B07CFF" : "#E0533D"} />
              <Crest className="rune-pulse absolute inset-[30%] h-[40%] w-[40%]" glow />
            </div>
            <p className="eyebrow mt-2">Raid Center</p>
            <h3 className="heading mt-1 text-2xl">{raid.name}</h3>
            <p className="muted mt-2 text-sm">{raid.display_text}</p>
            {raid.progress !== null && raid.target !== null && (
              <p className="hud-num mt-3 text-lg text-epic-light">Ancient Seal {raid.progress} / {raid.target}</p>
            )}
            <span className="mt-3 inline-block"><StatusPill status={raid.state === "dormant" || raid.state === "foreshadowed" ? "locked" : "open"} label={raid.state} /></span>
          </Link>
        )}
        <div className={raid ? "lg:col-span-3" : "lg:col-span-5"}>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">The Everbound Chronicle</p>
              <h3 className="heading mt-1 text-2xl">News from the Realm</h3>
            </div>
            <Link href="/chronicle/" className="link font-ui text-sm font-semibold uppercase tracking-[0.14em]">Chronicle ▸</Link>
          </div>
          <div className="grid gap-3">
            {recent.map((p) => (
              <Link key={p.id} href={`/story/?s=${p.slug}`} className="panel block transition hover:border-gold/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="eyebrow">{CHRONICLE_LABEL[p.category]}</span>
                  {p.published_at && <span className="hud-num text-parchment/50">{shortDate(p.published_at)}</span>}
                </div>
                <p className="mt-1 font-display text-lg text-gold-light">{p.title}</p>
                <p className="muted line-clamp-2 text-sm">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-eb mt-20">
        <div className="parchment-card p-8 text-center sm:p-12">
          <p className="font-ui text-[13px] font-bold uppercase tracking-[0.3em] text-forest">Founding Guild · Limited-time title</p>
          <h2 className="mt-2 font-display text-3xl font-bold">The world does not wait for heroes.</h2>
          <p className="mx-auto mt-3 max-w-xl text-midnight/75">Register during the founding season and carry the title <strong>Founding Adventurer</strong> for as long as the Guild stands.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/join/" className="btn bg-midnight text-gold-light hover:bg-midnight-800">Join the Guild</Link>
            <Link href="/calendar/" className="btn border border-midnight/40 text-midnight hover:bg-midnight/5">See the Calendar</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Hero({ stats }: { stats: Stats | null }) {
  const { viewer } = useViewer();
  const pad = (n: number) => String(n).padStart(3, "0");
  return (
    <section className="relative overflow-hidden border-b border-arcane/20">
      <HeroAtlas />
      <div className="container-eb relative grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[1.1fr,1fr]">
        <div className="text-center lg:text-left">
          <p className="eyebrow">Everbound · The Living Adventurers Guild</p>
          <h1 className="heading mt-4 text-4xl font-bold leading-tight sm:text-6xl">Your Legend<br />Begins Here</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-parchment/85 lg:mx-0">
            A real-world tabletop adventure with a persistent online guild. Your character, your loot and your choices carry over from table to table — and the world remembers.
          </p>
          {stats ? (
            <dl className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3 lg:mx-0">
              {([["Adventurers", stats.adventurers, "text-arcane-light"], ["Open Quests", stats.open_quests, "text-gold-light"], ["World Events", stats.world_events, "text-ember-light"]] as const).map(([l, v, c]) => (
                <div key={l} className="rounded-sm border border-white/10 bg-midnight-950/60 px-3 py-2 backdrop-blur">
                  <dd className={`hud-num text-3xl ${c}`}>{pad(v)}</dd>
                  <dt className="font-ui text-[11px] font-bold uppercase tracking-[0.22em] text-parchment/60">{l}</dt>
                </div>
              ))}
            </dl>
          ) : (
            <SetupNotice />
          )}
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="relative mx-auto -mb-16 aspect-square w-64 sm:w-72">
            <MagicCircle className="absolute inset-0" />
            <Crest className="absolute inset-[28%] h-[44%] w-[44%] animate-float" glow />
          </div>
          <div className="animate-popin relative">
            <SystemWindow title="Notice">
              <p className="font-ui text-[13px] font-bold uppercase tracking-[0.24em] text-gold-light">▶ A summoning has been detected</p>
              <p className="mt-3 text-parchment/90">
                {viewer ? (
                  <>Welcome back, <strong className="text-arcane-light">{viewer.character?.name ?? viewer.profile.display_name}</strong>. The Guild has new contracts waiting.</>
                ) : (
                  <>Welcome to the world of Everbound, Traveler. You have been granted the right to register with the <strong className="text-gold-light">Adventurers Guild</strong>. Will you accept?</>
                )}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {viewer ? (
                  <>
                    <Link href="/portal/" className="btn-gold">▸ Status Window</Link>
                    <Link href="/quests/" className="btn-arcane">▸ Quest Board</Link>
                  </>
                ) : (
                  <>
                    <Link href="/join/" className="btn-gold">▸ Accept · Join</Link>
                    <Link href="/quests/" className="btn-arcane">▸ View Quests</Link>
                  </>
                )}
              </div>
            </SystemWindow>
          </div>
        </div>
      </div>
    </section>
  );
}
