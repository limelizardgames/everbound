import Link from "next/link";
import { StatusPill } from "@/components/ui";
import { QUEST_TYPE_LABEL, money, shortDate } from "@/lib/format";
import type { QuestTemplate } from "@/lib/types";

export type QuestCardData = QuestTemplate & {
  next?: { starts_at: string; price_cents: number; seats_left: number } | null;
};

export function QuestCard({ quest }: { quest: QuestCardData }) {
  const locked = quest.status === "locked";
  const availability = locked ? "locked" : !quest.next ? "no dates" : quest.next.seats_left > 0 ? "open" : "full";
  return (
    <Link href={`/quest/?s=${quest.slug}`} className={`group block rounded-xl border p-5 transition ${locked ? "border-midnight-600 bg-midnight-900/50" : "border-gold/30 bg-gradient-to-b from-parchment/[0.06] to-transparent hover:border-gold/70 hover:shadow-gold"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{QUEST_TYPE_LABEL[quest.quest_type]}</span>
        <StatusPill status={availability === "no dates" ? "draft" : availability} label={availability} />
      </div>
      <h3 className={`mt-3 font-display text-xl ${locked ? "text-parchment/60" : "text-gold-light group-hover:text-gold"}`}>{quest.title}</h3>
      <p className="muted mt-2 line-clamp-2 text-sm">{quest.summary}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-parchment/50">Rank</dt>
        <dd className="text-right font-semibold">{quest.rank_min}–{quest.rank_max}</dd>
        <dt className="text-parchment/50">Party</dt>
        <dd className="text-right font-semibold">{quest.party_min}–{quest.party_max}</dd>
        <dt className="text-parchment/50">Reward</dt>
        <dd className="text-right font-semibold text-gold-light">{locked ? "Legendary" : quest.reward_preview?.split("·")[0]?.trim() ?? "—"}</dd>
        <dt className="text-parchment/50">Next</dt>
        <dd className="text-right font-semibold">{locked ? "Locked" : quest.next ? `${shortDate(quest.next.starts_at)} · ${money(quest.next.price_cents)}` : "TBA"}</dd>
      </dl>
    </Link>
  );
}
