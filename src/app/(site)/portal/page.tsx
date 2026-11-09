"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { Loading, useTitle } from "@/components/Guard";
import { Meter, Portrait, RankBadge, Stat, StatusPill, SystemWindow } from "@/components/ui";
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
          <p className="font-ui text-[13px] font-bold uppercase tracking-[0.3em] text-arcane-light">【 System · Registration 】</p>
          <h1 className="heading mt-2 text-3xl">Welcome, {profile.display_name}</h1>
          <p className="muted mt-3">Your Guild account is ready, Traveler. Complete these quests to finish registering:</p>
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
      <h1 className="sr-only">Adventurer Status</h1>
      <SystemWindow title="Status" right={profile.role !== "adventurer" ? <StatusPill status="unassigned" label={ROLE_LABEL[profile.role]} /> : <span className="hud-num text-[13px] uppercase tracking-[0.2em] text-parchment/60">{card ? card.card_number : "Unbound"}</span>}>
        <div className="grid gap-6 md:grid-cols-[auto,1fr]">
          <div className="flex flex-col items-center gap-3">
            <Portrait url={c.portrait_url} name={c.name} className="h-40 w-40" />
            <RankBadge code={t.rank_code} title={`Rank ${t.rank_code} · ${t.rank_title}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              <h2 className="font-display text-3xl font-bold text-parchment sm:text-4xl" style={{ textShadow: "0 0 18px rgba(143,227,242,.35)" }}>{c.name}</h2>
              <span className="hud-num pb-1 text-2xl text-gold-light">Lv. {t.level}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-ui text-[15px] sm:grid-cols-3">
              {([["Race", c.species.replace("_", "-")], ["Class", c.class], ["Title", t.rank_title]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-arcane/15 py-1">
                  <dt className="font-bold uppercase tracking-[0.16em] text-arcane-light/70">{k}</dt>
                  <dd className="font-semibold capitalize text-parchment">{v}</dd>
                </div>
              ))}
            </dl>
            {!card && <p className="mt-2 text-sm"><Link className="link" href="/portal/card/">⚠ No guild card bound — bind yours</Link></p>}
            <div className="mt-5 grid gap-4">
              <Meter label="HP" value={c.hp_current} max={c.hp_max} tone="hp" />
              <Meter label="EXP" value={t.xp} max={t.next_level_xp} tone="xp" />
              {t.next_rank_renown && <Meter label={`Renown → Rank ${nextRank(t.rank_code)}`} value={t.renown} max={t.next_rank_renown} tone="gold" />}
            </div>
            {c.conditions && <p className="mt-3 font-ui text-sm font-bold uppercase tracking-wider text-ember-light">⚠ Status effects: {c.conditions}</p>}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Gold" value={t.gold.toLocaleString()} />
          <Stat label="Renown" value={t.renown.toLocaleString()} />
          <Stat label="Total EXP" value={t.xp.toLocaleString()} tone="arcane" />
        </div>
      </SystemWindow>

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

const RANKS = ["F", "E", "D", "C", "B", "A", "S"];
function nextRank(code: string) {
  return RANKS[Math.min(RANKS.indexOf(code) + 1, RANKS.length - 1)];
}
