"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/portal", "Dashboard"], ["/portal/character", "Character"], ["/portal/card", "Guild Card"], ["/portal/inventory", "Inventory"],
  ["/portal/journal", "Journal"], ["/portal/bookings", "Bookings"], ["/portal/tavern", "Tavern"], ["/portal/achievements", "Achievements"],
  ["/portal/notifications", "Notices"], ["/portal/settings", "Settings"],
] as const;

export function PortalNav({ unread }: { unread: number }) {
  const path = usePathname().replace(/\/$/, "") || "/";
  return (
    <nav className="no-print -mx-4 mb-8 overflow-x-auto border-b border-gold/20 px-4" aria-label="Adventurer portal">
      <ul className="flex min-w-max gap-1">
        {ITEMS.map(([href, label]) => {
          const active = href === "/portal" ? path === "/portal" : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-[44px] items-center border-b-2 px-3 font-ui text-[14px] font-bold uppercase tracking-[0.14em] ${active ? "border-arcane text-arcane-light" : "border-transparent text-parchment/70 hover:text-parchment"}`}>
                {label}
                {href === "/portal/notifications" && unread > 0 && <span className="ml-1.5 rounded-full bg-arcane px-1.5 text-[10px] font-bold text-midnight">{unread}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
