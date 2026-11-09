import Link from "next/link";
import { getViewer, isStaff } from "@/lib/auth";
import { Wordmark } from "@/components/Crest";
import { MobileMenu } from "@/components/MobileMenu";

export const PUBLIC_NAV = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/world", label: "The World" },
  { href: "/quests", label: "Quest Board" },
  { href: "/calendar", label: "Calendar" },
  { href: "/chronicle", label: "Chronicle" },
  { href: "/raids", label: "Raids" },
  { href: "/leaderboards", label: "Hall of Legends" },
  { href: "/store", label: "Store" },
];

export async function SiteHeader() {
  const viewer = await getViewer();
  const staff = isStaff(viewer);
  return (
    <header className="no-print sticky top-0 z-40 border-b border-gold/20 bg-midnight-950/90 backdrop-blur">
      <div className="container-eb flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Everbound home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-5 text-sm lg:flex" aria-label="Main">
          {PUBLIC_NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-parchment/80 hover:text-gold-light">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {viewer ? (
            <>
              {staff && (
                <Link href="/gm" className="btn-arcane btn-sm">
                  Command Center
                </Link>
              )}
              <Link href="/portal" className="btn-gold btn-sm">
                My Guild Status{viewer.unread > 0 ? ` · ${viewer.unread}` : ""}
              </Link>
            </>
          ) : (
            <>
              <Link href="/join?mode=signin" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/join" className="btn-gold btn-sm">
                Join the Guild
              </Link>
            </>
          )}
        </div>
        <MobileMenu nav={PUBLIC_NAV} signedIn={!!viewer} staff={staff} unread={viewer?.unread ?? 0} />
      </div>
    </header>
  );
}
