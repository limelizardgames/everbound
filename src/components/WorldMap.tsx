import Link from "next/link";
import type { Location } from "@/lib/types";

const DOT: Record<string, string> = {
  peaceful: "#4E9C86", threatened: "#D4AA5A", besieged: "#C8553D", destroyed: "#C8553D", rebuilding: "#46BDD6", unknown: "#8b93a7",
};

/** Stylised parchment map. Undiscovered regions stay shrouded. */
export function WorldMap({ locations }: { locations: Location[] }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-gold/40 bg-[#1a2234] sm:aspect-[16/9]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="land" cx="50%" cy="50%" r="60%">
            <stop offset="0" stopColor="#E9DCC3" stopOpacity=".22" />
            <stop offset="1" stopColor="#E9DCC3" stopOpacity=".04" />
          </radialGradient>
        </defs>
        <path d="M8 40 C 10 20, 30 8, 52 8 C 75 6, 92 18, 93 40 C 95 62, 88 85, 62 92 C 40 97, 14 88, 9 68 Z" fill="url(#land)" stroke="#D4AA5A" strokeOpacity=".35" strokeWidth=".4" />
        <path d="M20 50 Q 40 45 50 55 T 80 58" fill="none" stroke="#D4AA5A" strokeOpacity=".25" strokeDasharray="1 1.2" strokeWidth=".35" />
        <path d="M50 55 Q 48 35 52 18" fill="none" stroke="#D4AA5A" strokeOpacity=".25" strokeDasharray="1 1.2" strokeWidth=".35" />
        <circle cx="85" cy="15" r="14" fill="#0a0f1a" opacity=".55" />
        <circle cx="15" cy="50" r="10" fill="#0a0f1a" opacity=".55" />
      </svg>
      {locations.map((l) => (
        <Link
          key={l.id}
          href={`/world/${l.slug}`}
          className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
          style={{ left: `${l.map_x}%`, top: `${l.map_y}%` }}
          aria-label={`${l.name} — ${l.status}`}
        >
          <span className="block h-3.5 w-3.5 rounded-full border-2 border-midnight-950 ring-2 ring-offset-0 transition group-hover:scale-125 group-focus-visible:scale-125" style={{ background: DOT[l.status], boxShadow: `0 0 12px ${DOT[l.status]}` }} />
          <span className="pointer-events-none absolute left-1/2 top-5 hidden -translate-x-1/2 whitespace-nowrap rounded bg-midnight-950/90 px-2 py-0.5 text-[11px] text-parchment sm:block">
            {l.name}
          </span>
        </Link>
      ))}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 rounded bg-midnight-950/80 p-2 text-[10px] uppercase tracking-wider">
        {Object.entries(DOT).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{k}</span>
        ))}
      </div>
    </div>
  );
}
