import Link from "next/link";
import { Crest } from "@/components/Crest";
import { CalmToggle } from "@/components/CalmToggle";

const COLS: [string, [string, string][]][] = [
  ["Play", [["Quest Board", "/quests/"], ["Events Calendar", "/calendar/"], ["Raid Center", "/raids/"], ["Auction Hall", "/auction/"], ["Join the Guild", "/join/"]]],
  ["The World", [["World Atlas", "/world/"], ["The Chronicle", "/chronicle/"], ["Hall of Legends", "/leaderboards/"]]],
  ["Guild", [["How It Works", "/how-it-works/"], ["Guild Store", "/store/"], ["My Status", "/portal/"]]],
];

export function SiteFooter() {
  return (
    <footer className="no-print relative mt-28 overflow-hidden border-t border-gold/20 bg-midnight-950">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[18vw] font-bold leading-none tracking-[0.08em] text-white/[0.025]">EVERBOUND</div>
      <div className="container-eb relative grid gap-10 py-14 md:grid-cols-[1.4fr,2fr]">
        <div>
          <div className="flex items-center gap-3">
            <Crest className="h-12 w-12" glow />
            <div>
              <p className="font-display text-xl font-bold tracking-[0.2em] text-gold-light">EVERBOUND</p>
              <p className="font-ui text-[12px] font-semibold uppercase tracking-[0.3em] text-parchment/60">The Living Adventurers Guild</p>
            </div>
          </div>
          <p className="muted mt-4 max-w-sm text-sm">A real-world tabletop adventure with a persistent online guild. The world remembers what its players have done.</p>
          <Link href="/join/" className="btn-gold btn-sm mt-5">Start Adventure</Link>
        </div>
        <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
          {COLS.map(([title, links]) => (
            <div key={title}>
              <p className="font-ui text-[13px] font-bold uppercase tracking-[0.24em] text-arcane-light">{title}</p>
              <ul className="mt-3 grid gap-2 text-sm">
                {links.map(([l, h]) => <li key={h}><Link href={h} className="text-parchment/70 hover:text-gold-light">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="relative border-t border-white/5">
        <div className="container-eb flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-parchment/50">
          <p>A Lime Lizard Games concept. All world content is fictional.</p>
          <CalmToggle />
        </div>
      </div>
    </footer>
  );
}
