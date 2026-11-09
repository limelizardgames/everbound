import { Portrait, RankBadge } from "@/components/ui";
import { shortDate } from "@/lib/format";
import type { PublicCharacter } from "@/lib/types";

export function CharacterProfile({ c, cardNumber }: { c: PublicCharacter; cardNumber: string }) {
  return (
    <div className="panel-arcane sm:p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Portrait url={c.portrait_url} name={c.name} className="h-32 w-32" />
        <div className="flex-1 text-center sm:text-left">
          <p className="eyebrow">Verified Guild Member · {cardNumber}</p>
          <h1 className="heading mt-1 text-3xl sm:text-4xl">{c.name}</h1>
          <p className="muted mt-1">
            {c.species} · {c.class} · Level {c.level}
            {c.pronouns ? ` · ${c.pronouns}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
            <RankBadge code={c.rank_code} title={c.rank_title} />
            <span className="text-sm"><span className="font-display text-xl text-gold-light">{c.renown}</span> <span className="muted">renown</span></span>
            <span className="text-sm"><span className="font-display text-xl text-gold-light">{c.quests_completed}</span> <span className="muted">quests</span></span>
          </div>
          <p className="muted mt-2 text-xs">Member since {shortDate(c.joined)}</p>
        </div>
      </div>
      {c.achievements.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-gold-light">Titles &amp; Achievements</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {c.achievements.map((a) => (
              <li key={a.name} className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm text-gold-light" title={a.description}>{a.name}</li>
            ))}
          </ul>
        </div>
      )}
      {c.history.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-gold-light">Recent deeds</h2>
          <ul className="mt-3 divide-y divide-midnight-700">
            {c.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-4 py-2 text-sm">
                <span>{h.title}</span>
                <span className="muted shrink-0">{shortDate(h.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
