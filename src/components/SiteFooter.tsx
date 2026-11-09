import Link from "next/link";
import { Wordmark } from "@/components/Crest";
import { CalmToggle } from "@/components/CalmToggle";

export function SiteFooter() {
  return (
    <footer className="no-print mt-20 border-t border-gold/20 bg-midnight-950">
      <div className="container-eb grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <Wordmark small />
          <p className="muted mt-3 text-sm">The Living Adventurers Guild. A persistent tabletop world that remembers what its players have done.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/how-it-works" className="muted hover:text-parchment">How It Works</Link>
          <Link href="/quests" className="muted hover:text-parchment">Quest Board</Link>
          <Link href="/world" className="muted hover:text-parchment">The World</Link>
          <Link href="/chronicle" className="muted hover:text-parchment">Chronicle</Link>
          <Link href="/store" className="muted hover:text-parchment">Guild Store</Link>
          <Link href="/join" className="muted hover:text-parchment">Join the Guild</Link>
        </div>
        <div className="text-sm sm:text-right">
          <CalmToggle />
          <p className="muted mt-3 text-xs">A Lime Lizard Games concept. All world content is fictional.</p>
        </div>
      </div>
    </footer>
  );
}
