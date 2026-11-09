"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { Loading, useTitle } from "@/components/Guard";
import { Meter, Portrait, RankBadge, Stat, StatusPill } from "@/components/ui";
import { dateTime, relative } from "@/lib/format";
import { ROLE_LABEL, roleAtLeast } from "@/lib/types";

export default function Dashboard() {
  useTitle("Adventurer Status");
  const { viewer } = useViewer();
  const c = viewer?.character;
  const { data } = useData(async () => {
    const now = new Date().toISOString();
    const [bookings, history, notes] = await Promise.all([
      must(sb().from("reservations")
        .select("id, status, payment_status, session:quest_sessions!inner(id, starts_at, venue, table_label, template:quest_templates(title, slug, summary, reward_preview))")
        .eq("profile_id", viewer!.userId).in("status", ["confirmed", "pending_payment", "waitlisted"])
        .gt("session.starts_at", now).order("created_at")),
      must(sb().from("character_history").select("id, title, entry_type, created_at").eq("character_id", c!.id).order("created_at", { ascending: false }).limit(5)),
      must(sb().from("notifications").select("id, title, body, link, created_at, read_at").eq("profile_id", viewer!.userId).order("created_at", { ascending: false }).limit(3)),
    ]);
    return { bookings, history: history as { id: string; title: string; created_at: string }[], notes: notes as { id: string; title: string; link: string | null; created_at: string; read_at: string | null }[] };
  }, [c?.id], !!c);
  if (!viewer) return null;
  const { totals: t, card, profile } = viewer;

  if (!c || !t) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="panel-arcane text-center sm:p-10">
          <p className="eyebrow">Everbound Guild System</p>
          <h1 className="heading mt-2 text-3xl">Welcome, {profile.display_name}</h1>
          <p className="muted mt-3">Your Guild account is ready. Complete your registration in two steps:</p>
          <ol className="mx-auto mt-6 grid max-w-md gap-3 text-left">
            <li className="flex items-center justify-between rounded-lg border border-midnight-600 p-3">
              <span>1. Bind your physical guild card</span>
              {card ? <StatusPill status="claimed" label={card.card_number} /> : <Link href="/portal/card/" className="btn-ghost btn-sm">How?</Link>}
            </li>
            <li className="flex items-center justify-between rounded-lg border border-midnight-600 p-3">
              <span>2. Register your adventurer</span>
              <Link href="/portal/character/new/" className="btn-gold btn-sm">Begin</Link>
            </li>
          </ol>
          {roleAtLeast(profile.role, "game_master") && <p className="mt-6 text-sm"><Link className="link" href="/gm/">Open the Command Center →</Link></p>}
        </div>
      </div>
    );
  }

  if (!data) return <Loading />;
  const { bookings, history, notes } = data;
  type B = { id: string; status: string; payment_status: string; session: { id: string; starts_at: string; venue: string; table_label: string | null; template: { title: string; slug: string; summary: string; reward_preview: string | null } } };
  const upcoming = ((bookings ?? []) as unknown as B[]).sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));
  const next = upcoming.find((b) => b.status !== "waitlisted") ?? upcoming[0];

  return (
    <div>
      <div className="panel-arcane arcane-shimmer sm:p-8">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Everbound Guild System</p>
          {profile.role !== "adventurer" && <StatusPill status="unassigned" label={ROLE_LABEL[profile.role]} />}
        </div>
        <h1 className="heading mt-1 text-2xl">Adventurer Status</h1>
        <div className="mt-6 grid gap-6 md:grid-cols-[auto,1fr]">
          <div className="flex flex-col items-center gap-3">
            <Portrait url={c.portrait_url} name={c.name} className="h-36 w-36" />
            <RankBadge code={t.rank_code} title={`Rank ${t.rank_code} · ${t.rank_title}`} />
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-parchment sm:text-4xl">{c.name}</h2>
            <p className="muted mt-1 capitalize">{c.species.replace("_", " ")} · {c.class} · Level {t.level}</p>
            <p className="mt-1 font-mono text-sm text-gold-light">{card ? `Guild No. ${card.card_number}` : <Link className="link" href="/portal/card/">No guild card bound</Link>}</p>
            <div className="mt-5 grid gap-4">
              <Meter label="XP" value={t.xp} max={t.next_level_xp} tone="arcane" />
              <Meter label="HP" value={c.hp_current} max={c.hp_max} tone={c.hp_current / c.hp_max < 0.35 ? "ember" : "forest"} />
              {t.next_rank_renown && <Meter label="Renown to next rank" value={t.renown} max={t.next_rank_renown} tone="gold" />}
            </div>
            {c.conditions && <p className="mt-3 text-sm text-ember">Conditions: {c.conditions}</p>}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="HP" value={`${c.hp_current}/${c.hp_max}`} tone="arcane" />
          <Stat label="Gold" value={t.gold.toLocaleString()} />
          <Stat label="Renown" value={t.renown.toLocaleString()} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">{next ? (next.status === "waitlisted" ? "Waitlisted" : "Next quest") : "Active quest"}</h2>
            {next && <StatusPill status={next.status} />}
          </div>
          {next ? (
            <>
              <Link href={`/quest/?s=${next.session.template.slug}`} className="mt-2 block font-display text-2xl text-gold-light hover:text-gold">{next.session.template.title}</Link>
              <p className="muted mt-1 text-sm">{next.session.template.summary}</p>
              <p className="mt-3 text-sm"><span className="font-semibold">{dateTime(next.session.starts_at)}</span> · {next.session.venue}{next.session.table_label ? ` · ${next.session.table_label}` : ""}</p>
              {next.session.template.reward_preview && <p className="mt-1 text-sm text-gold-light">Reward: {next.session.template.reward_preview}</p>}
              {upcoming.length > 1 && <p className="muted mt-3 text-xs">+{upcoming.length - 1} more booking{upcoming.length > 2 ? "s" : ""}</p>}
            </>
          ) : (
            <div className="mt-2">
              <p className="muted text-sm">No quest accepted yet.</p>
              <Link href="/quests/" className="btn-gold btn-sm mt-3">Visit the Quest Board</Link>
            </div>
          )}
        </section>
        <section className="panel">
          <h2 className="eyebrow">Guild notices</h2>
          {notes && notes.length > 0 ? (
            <ul className="mt-2 divide-y divide-midnight-700">
              {notes.map((n) => (
                <li key={n.id} className="py-2">
                  <Link href={n.link ?? "/portal/notifications/"} className="block">
                    <span className={`font-semibold ${n.read_at ? "text-parchment/70" : "text-arcane-light"}`}>{n.title}</span>
                    <span className="muted block text-xs">{relative(n.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted mt-2 text-sm">No notices.</p>
          )}
        </section>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["/portal/inventory/", "Inventory"], ["/portal/journal/", "Journal"], ["/portal/bookings/", "Sessions"], ["/portal/tavern/", "Guild Chat"]].map(([h, l]) => (
          <Link key={h} href={h} className="btn-ghost">{l}</Link>
        ))}
      </div>

      {history && history.length > 0 && (
        <section className="panel mt-6">
          <h2 className="eyebrow">Recent deeds</h2>
          <ul className="mt-2 divide-y divide-midnight-700">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-3 py-2 text-sm"><span>{h.title}</span><span className="muted shrink-0">{relative(h.created_at)}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
