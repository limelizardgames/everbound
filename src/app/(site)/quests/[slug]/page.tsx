import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { upcomingSessions } from "@/lib/queries";
import { Flash, RankBadge, StatusPill, type SP } from "@/components/ui";
import { SessionRow } from "@/components/SessionRow";
import { SetupNotice } from "@/components/SetupNotice";
import { QUEST_TYPE_LABEL } from "@/lib/format";
import type { QuestTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuestDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SP }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { slug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("quest_templates").select("*, location:locations(name, slug)").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const quest = data as QuestTemplate & { location: { name: string; slug: string } | null };
  const [sessions, viewer, { data: objectives }] = await Promise.all([
    upcomingSessions({ templateId: quest.id }),
    getViewer(),
    supabase.from("quest_objectives").select("id, description, sort").eq("template_id", quest.id).eq("is_secret", false).order("sort"),
  ]);
  let myRes = new Map<string, string>();
  if (viewer && sessions.length) {
    const { data: mine } = await supabase.from("reservations").select("session_id, status").eq("profile_id", viewer.userId).neq("status", "canceled").in("session_id", sessions.map((s) => s.id));
    myRes = new Map((mine ?? []).map((r) => [r.session_id, r.status]));
  }
  const locked = quest.status === "locked";
  const back = `/quests/${quest.slug}`;

  return (
    <div className="container-eb max-w-5xl py-12">
      <Link href="/quests" className="link text-sm">← Quest Board</Link>
      <div className="mt-4"><Flash ok={query.ok} error={query.error} /></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <article className="parchment-card p-6 sm:p-8 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-forest">{QUEST_TYPE_LABEL[quest.quest_type]}</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{quest.title}</h1>
          <p className="mt-3 text-lg text-midnight/80">{quest.summary}</p>
          <div className="mt-5 whitespace-pre-line leading-relaxed text-midnight/85">{quest.description}</div>
          {objectives && objectives.length > 0 && (
            <>
              <h2 className="mt-6 font-display text-xl font-bold">Objectives</h2>
              <ul className="mt-2 list-inside list-disc text-midnight/85">
                {objectives.map((o) => <li key={o.id}>{o.description}</li>)}
              </ul>
            </>
          )}
          {quest.content_advisories.length > 0 && (
            <p className="mt-6 rounded-md border border-midnight/20 bg-midnight/5 p-3 text-sm"><strong>Content advisories:</strong> {quest.content_advisories.join(", ")}</p>
          )}
        </article>
        <aside className="panel h-fit">
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="muted">Rank</dt><dd className="flex justify-end gap-1"><RankBadge code={quest.rank_min} size="sm" />–<RankBadge code={quest.rank_max} size="sm" /></dd>
            <dt className="muted">Difficulty</dt><dd className="text-right capitalize">{quest.difficulty}</dd>
            <dt className="muted">Suggested level</dt><dd className="text-right">{quest.suggested_level}+</dd>
            <dt className="muted">Party size</dt><dd className="text-right">{quest.party_min}–{quest.party_max}</dd>
            <dt className="muted">Playtime</dt><dd className="text-right">~{Math.round(quest.est_minutes / 60 * 10) / 10} hours</dd>
            {quest.location && (<><dt className="muted">Location</dt><dd className="text-right"><Link className="link" href={`/world/${quest.location.slug}`}>{quest.location.name}</Link></dd></>)}
            <dt className="muted">Rewards</dt><dd className="text-right text-gold-light">{quest.reward_preview}</dd>
          </dl>
          {locked && <div className="mt-4"><StatusPill status="locked" label="Locked — conditions unknown" /></div>}
        </aside>
      </div>

      {!locked && (
        <section className="mt-10">
          <h2 className="heading text-2xl">Scheduled adventures</h2>
          {!viewer && <p className="muted mt-1 text-sm"><Link className="link" href={`/join?next=${encodeURIComponent(back)}`}>Join the Guild</Link> to accept this quest.</p>}
          {viewer && !viewer.character && <p className="muted mt-1 text-sm"><Link className="link" href="/portal/character/new">Register your adventurer</Link> to accept this quest.</p>}
          {sessions.length ? (
            <ul className="mt-4 grid gap-3">
              {sessions.map((s) => <SessionRow key={s.id} s={s} back={back} mine={myRes.get(s.id)} bookable={!!viewer?.character} />)}
            </ul>
          ) : (
            <p className="muted mt-4">No dates scheduled yet. Check the calendar soon.</p>
          )}
        </section>
      )}
    </div>
  );
}
