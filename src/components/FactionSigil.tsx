import { Crest } from "@/components/Crest";
import type { Faction } from "@/lib/types";

/** Tailwind classes per faction colour. */
export const FACTION_TONE: Record<Faction["color"], { text: string; border: string; bg: string; ring: string }> = {
  gold: { text: "text-gold-light", border: "border-gold/60", bg: "bg-gold/10", ring: "shadow-[0_0_30px_-12px_rgba(212,170,90,.8)]" },
  ember: { text: "text-ember-light", border: "border-ember/60", bg: "bg-ember/10", ring: "shadow-[0_0_30px_-12px_rgba(224,83,61,.8)]" },
  arcane: { text: "text-arcane-light", border: "border-arcane/60", bg: "bg-arcane/10", ring: "shadow-[0_0_30px_-12px_rgba(70,189,214,.8)]" },
  epic: { text: "text-epic", border: "border-epic/60", bg: "bg-epic/10", ring: "" },
  green: { text: "text-emerald-300", border: "border-emerald-400/60", bg: "bg-emerald-400/10", ring: "" },
};

export const RAID_SIDE_LABEL = { attackers: "Raiders", defenders: "Defenders", either: "Either side" } as const;

/** Line-art emblem for a faction (the Guild uses its crest). */
export function FactionSigil({ slug, className = "h-12 w-12" }: { slug: string; className?: string }) {
  if (slug === "adventurers-guild") return <Crest className={className} />;
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {slug === "ashen-covenant" ? (
        <>
          {/* flame within a broken ring */}
          <path d="M24 40 C15 40 12 33 15 26 C17 21 21 19 20 12 C26 15 31 21 29 28 C32 26 33 23 32 20 C36 24 37 30 34 35 C32 38 28 40 24 40 Z" />
          <path d="M24 36 C21 36 20 33 21.5 30 C22.5 28 24 27 24 24 C27 27 28 32 24 36 Z" fill="currentColor" fillOpacity=".35" />
          <path d="M8 24 A16 16 0 0 1 14 11.5 M40 24 A16 16 0 0 0 34 11.5" strokeDasharray="2 3" />
        </>
      ) : slug === "free-companies" ? (
        <>
          {/* crossed blades over a coin */}
          <circle cx="24" cy="30" r="8" />
          <path d="M24 26 V34 M21.5 28 H26.5" />
          <path d="M9 7 L30 28 M39 7 L18 28" />
          <path d="M12 12 L8 16 M36 12 L40 16" />
        </>
      ) : (
        <path d="M24 6 L28.5 18 L41 19 L31.5 27 L34.5 40 L24 33 L13.5 40 L16.5 27 L7 19 L19.5 18 Z" />
      )}
    </svg>
  );
}
