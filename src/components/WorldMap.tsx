import Link from "next/link";
import type { Location } from "@/lib/types";

const DOT: Record<string, string> = {
  peaceful: "#4ADE80", threatened: "#F0D79A", besieged: "#FF7A5C", destroyed: "#E0533D", rebuilding: "#46BDD6", unknown: "#9aa3b5",
};
const COAST =
  "M9 62 C5 48 8 36 17 30 C25 24 23 15 33 11 C45 6 54 10 64 6 C76 2 86 8 91 18 C96 28 92 38 95 48 C98 60 93 74 82 78 C72 82 68 90 55 90 C42 90 38 84 27 86 C17 88 12 76 9 62 Z";

/** The realm as an engraved chart. Pins are live data; undiscovered lands stay off the map. */
export function WorldMap({ locations }: { locations: Location[] }) {
  const hub = locations.find((l) => l.slug === "highmere") ?? locations[0];
  const gold = "#D4AA5A";
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-gold/40 bg-[radial-gradient(120%_90%_at_50%_40%,#13213a,#0b1324_60%,#070b14)] shadow-[0_30px_60px_-30px_rgba(0,0,0,.9),inset_0_0_0_6px_rgba(7,11,20,.9),inset_0_0_0_7px_rgba(212,170,90,.25)] sm:aspect-[16/9]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="wm-hatch" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="1.2" stroke={gold} strokeOpacity="0.1" strokeWidth="0.2" /></pattern>
          <filter id="wm-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" /><feColorMatrix values="0 0 0 0 0.83  0 0 0 0 0.67  0 0 0 0 0.35  0 0 0 0.08 0" /></filter>
        </defs>
        <g stroke="#8FE3F2" strokeOpacity="0.07" strokeWidth="0.15" vectorEffect="non-scaling-stroke">
          {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={10 + i * 10} y1="0" x2={10 + i * 10} y2="100" />)}
          {Array.from({ length: 9 }).map((_, i) => <line key={`h${i}`} x1="0" y1={10 + i * 10} x2="100" y2={10 + i * 10} />)}
        </g>
        <path d={COAST} fill="none" stroke="url(#wm-hatch)" strokeWidth="7" />
        <path d={COAST} fill="#101c33" fillOpacity="0.9" />
        <path d={COAST} fill="none" stroke={gold} strokeOpacity="0.5" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        {[[70, 22, 9], [28, 40, 7], [80, 58, 6]].map(([x, y, r], i) => (
          <g key={i} fill="none" stroke={gold} vectorEffect="non-scaling-stroke">
            {[1, 0.72, 0.46, 0.22].map((k, j) => <ellipse key={j} cx={x} cy={y} rx={r * k * 1.3} ry={r * k} strokeOpacity={0.1 + j * 0.035} strokeWidth="1" vectorEffect="non-scaling-stroke" transform={`rotate(${i * 25 - 15} ${x} ${y})`} />)}
          </g>
        ))}
        {hub && locations.filter((l) => l.id !== hub.id).map((l) => (
          <path key={l.id} d={`M${hub.map_x} ${hub.map_y} Q ${(Number(hub.map_x) + Number(l.map_x)) / 2 + 3} ${(Number(hub.map_y) + Number(l.map_y)) / 2 - 3} ${l.map_x} ${l.map_y}`} fill="none" stroke={gold} strokeOpacity="0.5" strokeWidth="1.3" strokeDasharray="1 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
        <rect width="100" height="100" filter="url(#wm-grain)" />
      </svg>
      <span aria-hidden className="absolute left-[4%] top-[8%] font-display text-[10px] italic tracking-[0.4em] text-parchment/25 sm:text-xs">Terra Incognita</span>
      <span aria-hidden className="absolute bottom-[14%] right-[5%] font-display text-[10px] italic tracking-[0.4em] text-parchment/25 sm:text-xs">Here be wyrms</span>
      <svg aria-hidden viewBox="-60 -60 120 120" className="absolute bottom-3 right-3 h-14 w-14 text-gold/50 sm:h-20 sm:w-20" fill="none" stroke="currentColor">
        <circle r="40" /><circle r="31" strokeDasharray="2 3" />
        <path d="M0 -52 L7 -7 L0 0 L-7 -7 Z" fill="currentColor" /><path d="M0 52 L7 7 L0 0 L-7 7 Z" /><path d="M-52 0 L-7 -7 L0 0 L-7 7 Z" /><path d="M52 0 L7 -7 L0 0 L7 7 Z" />
      </svg>
      {locations.map((l) => (
        <Link key={l.id} href={`/place/?s=${l.slug}`} className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 focus:outline-none" style={{ left: `${l.map_x}%`, top: `${l.map_y}%` }} aria-label={`${l.name} — ${l.status}`}>
          <span className="relative flex h-5 w-5 items-center justify-center">
            {(l.status === "threatened" || l.status === "besieged") && <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ background: DOT[l.status] }} />}
            <span className="block h-3 w-3 rotate-45 border-2 border-midnight-950 transition group-hover:scale-150 group-focus-visible:scale-150" style={{ background: DOT[l.status], boxShadow: `0 0 14px ${DOT[l.status]}` }} />
          </span>
          <span className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap font-display text-[10px] uppercase tracking-[0.2em] text-parchment/80 transition [text-shadow:0_1px_4px_#070b14,0_0_10px_#070b14] group-hover:text-gold-light sm:text-[12px]">
            {l.name}
          </span>
        </Link>
      ))}
      <div className="absolute bottom-2 left-2 flex max-w-[70%] flex-wrap gap-x-3 gap-y-1 rounded-sm border border-white/10 bg-midnight-950/85 px-2.5 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.14em]">
        {Object.entries(DOT).map(([k, c]) => <span key={k} className="flex items-center gap-1.5" style={{ color: c }}><span className="h-1.5 w-1.5 rotate-45" style={{ background: c }} />{k}</span>)}
      </div>
    </div>
  );
}
