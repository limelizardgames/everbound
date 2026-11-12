import Link from "next/link";
import { RankBadge, StatusPill } from "@/components/ui";
import { QUEST_TYPE_LABEL, money, shortDate } from "@/lib/format";
import type { QuestTemplate } from "@/lib/types";

export type QuestCardData = QuestTemplate & {
  next?: { starts_at: string; price_cents: number; seats_left: number } | null;
};

/** Difficulty → MMO difficulty colour. */
export const DIFFICULTY: Record<string, { label: string; color: string }> = {
  gentle: { label: "Easy", color: "#4ADE80" },
  moderate: { label: "Normal", color: "#46BDD6" },
  hard: { label: "Hard", color: "#B07CFF" },
  deadly: { label: "Deadly", color: "#E0533D" },
};

/** The "!" a quest-giver shows above their head. Gold = available, grey = locked. */
export function QuestMarker({ locked = false, className = "" }: { locked?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center font-display text-xl font-bold ${locked ? "text-parchment/40" : "text-midnight-950"} ${className}`}
      style={{
        clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)",
        background: locked ? "linear-gradient(160deg,#3a4458,#1c2944)" : "linear-gradient(160deg,#fff1c9,#d4aa5a 55%,#a9843d)",
        filter: locked ? undefined : "drop-shadow(0 0 8px rgba(240,215,154,.7))",
      }}
    >
      {locked ? "?" : "!"}
    </span>
  );
}

export function QuestCard({ quest }: { quest: QuestCardData }) {
  const locked = quest.status === "locked";
  const availability = locked ? "locked" : !quest.next ? "no dates" : quest.next.seats_left > 0 ? "open" : "full";
  const diff = DIFFICULTY[quest.difficulty] ?? DIFFICULTY.moderate;
  const rewards = (quest.reward_preview ?? "").split("·").map((r) => r.trim()).filter(Boolean);
  return (
    <Link
      href={`/quest/?s=${quest.slug}`}
      className={`panel group block overflow-hidden transition ${locked ? "opacity-80" : "hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-gold"}`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${locked ? "#3a4458" : diff.color}, transparent)` }} />
      <div className="flex items-start gap-3">
        <QuestMarker locked={locked} className={locked ? "" : "group-hover:animate-float"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-ui text-[12px] font-bold uppercase tracking-[0.2em] text-arcane-light/80">{QUEST_TYPE_LABEL[quest.quest_type]}</span>
            <StatusPill status={availability === "no dates" ? "draft" : availability} label={availability} />
          </div>
          <h3 className={`mt-1 font-display text-xl leading-tight ${locked ? "text-parchment/60" : "text-gold-light group-hover:text-gold"}`}>{quest.title}</h3>
        </div>
      </div>
      <p className="muted mt-3 line-clamp-2 text-sm">{locked ? "Requirements unknown. The Guild has not found a way forward… yet." : quest.summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-ui text-[13px] font-semibold uppercase tracking-[0.1em]">
        <span className="flex items-center gap-1.5"><RankBadge code={quest.rank_min} size="sm" /><span className="text-parchment/50">–</span><RankBadge code={quest.rank_max} size="sm" /></span>
        <span style={{ color: locked ? undefined : diff.color }} className={locked ? "text-parchment/50" : ""}>◆ {diff.label}</span>
        <span className="text-parchment/70">⚑ {quest.party_min}–{quest.party_max}</span>
        {quest.min_age && <span className="rounded-sm border border-ember/50 px-1.5 text-ember-light">{quest.min_age}+</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {locked ? (
          <span className="rounded-sm border border-rarity-legendary/50 bg-rarity-legendary/10 px-2 py-0.5 font-ui text-[12px] font-bold uppercase tracking-wider text-rarity-legendary">Legendary rewards</span>
        ) : (
          rewards.map((r, i) => (
            <span key={r} className={`rounded-sm border px-2 py-0.5 font-ui text-[12px] font-bold uppercase tracking-wider ${i === 0 ? "border-gold/50 bg-gold/10 text-gold-light" : i === 1 ? "border-epic/50 bg-epic/10 text-epic-light" : "border-rarity-uncommon/40 bg-rarity-uncommon/10 text-rarity-uncommon"}`}>{r}</span>
          ))
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 font-ui text-[13px] font-semibold uppercase tracking-[0.12em]">
        <span className="text-parchment/55">Next session</span>
        <span className="hud-num text-parchment">{locked ? "Sealed" : quest.next ? `${shortDate(quest.next.starts_at)} · ${money(quest.next.price_cents)}` : "TBA"}</span>
      </div>
    </Link>
  );
}
