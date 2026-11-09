"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/gm", "Command Center"], ["/gm/sessions", "Session Manager"], ["/gm/quests", "Quest Creator"], ["/gm/cards", "Guild Cards"],
  ["/gm/world", "World Editor"], ["/gm/raids", "Raid Controller"], ["/gm/players", "Players & Moderation"], ["/gm/audit", "Audit Log"], ["/gm/settings", "Settings & Orders"],
] as const;

export function GmNav() {
  const path = usePathname();
  return (
    <nav className="no-print -mx-4 mb-8 overflow-x-auto border-b border-arcane/30 px-4" aria-label="Guild Master portal">
      <ul className="flex min-w-max gap-1">
        {ITEMS.map(([href, label]) => {
          const active = href === "/gm" ? path === "/gm" : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-[44px] items-center border-b-2 px-3 text-sm ${active ? "border-gold text-gold-light" : "border-transparent text-parchment/70 hover:text-parchment"}`}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
