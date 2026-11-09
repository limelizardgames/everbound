"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useViewer, isStaff } from "@/lib/viewer";
import { Wordmark } from "@/components/Crest";
import { MobileMenu } from "@/components/MobileMenu";
import { RankBadge } from "@/components/ui";

export const PUBLIC_NAV = [
  { href: "/how-it-works/", label: "Guide" },
  { href: "/world/", label: "World" },
  { href: "/quests/", label: "Quests" },
  { href: "/calendar/", label: "Calendar" },
  { href: "/chronicle/", label: "Chronicle" },
  { href: "/raids/", label: "Raids" },
  { href: "/leaderboards/", label: "Rankings" },
  { href: "/store/", label: "Shop" },
];

export function SiteHeader() {
  const { viewer, loading } = useViewer();
  const path = usePathname();
  const staff = isStaff(viewer);
  return (
    <header className="no-print sticky top-0 z-40 border-b border-arcane/25 bg-midnight-950/85 backdrop-blur-md">
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-arcane/70 to-transparent" />
      <div className="container-eb flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Everbound home"><Wordmark /></Link>
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {PUBLIC_NAV.map((n) => {
            const active = path.startsWith(n.href.replace(/\/$/, ""));
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                className={`relative whitespace-nowrap px-2.5 py-2 font-ui text-[14px] font-bold uppercase tracking-[0.16em] transition ${active ? "text-arcane-light" : "text-parchment/75 hover:text-gold-light"}`}>
                {n.label}
                {active && <span aria-hidden className="absolute inset-x-2 -bottom-[13px] h-0.5 bg-arcane shadow-[0_0_8px_#46BDD6]" />}
              </Link>
            );
          })}
        </nav>
        <div className={`hidden shrink-0 items-center gap-2 xl:flex ${loading ? "invisible" : ""}`}>
          {viewer ? (
            <>
              {staff && <Link href="/gm/" className="btn-arcane btn-sm">GM Console</Link>}
              <Link href="/portal/" className="group flex items-center gap-2 rounded-sm border border-gold/40 bg-gold/5 py-1 pl-1.5 pr-3 transition hover:border-gold hover:bg-gold/10">
                <RankBadge code={viewer.totals?.rank_code ?? "F"} size="sm" />
                <span className="leading-tight">
                  <span className="block max-w-[9rem] truncate font-ui text-[14px] font-bold text-parchment">{viewer.character?.name ?? viewer.profile.display_name}</span>
                  <span className="block font-ui text-[11px] font-bold uppercase tracking-[0.18em] text-arcane-light">
                    {viewer.totals ? `Lv ${viewer.totals.level} · ${viewer.totals.gold} g` : "Status"}
                  </span>
                </span>
                {viewer.unread > 0 && <span className="ml-1 rounded-sm bg-ember px-1.5 font-ui text-[11px] font-bold text-white">{viewer.unread}</span>}
              </Link>
            </>
          ) : (
            <>
              <Link href="/join/?mode=signin" className="btn-ghost btn-sm">Log in</Link>
              <Link href="/join/" className="btn-gold btn-sm">Start Adventure</Link>
            </>
          )}
        </div>
        <MobileMenu nav={PUBLIC_NAV} signedIn={!!viewer} staff={staff} unread={viewer?.unread ?? 0} />
      </div>
    </header>
  );
}
