"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MobileMenu({ nav, signedIn, staff, unread }: { nav: { href: string; label: string }[]; signedIn: boolean; staff: boolean; unread: number }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <div className="lg:hidden">
      <button type="button" className="btn-ghost btn-sm" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : "Menu"}
        {unread > 0 && !open && <span className="ml-1 rounded-full bg-arcane px-1.5 text-[10px] text-midnight">{unread}</span>}
      </button>
      {open && (
        <nav id="mobile-nav" className="absolute inset-x-0 top-16 border-b border-gold/20 bg-midnight-950 px-4 pb-6 pt-2 shadow-2xl" aria-label="Mobile">
          <div className="grid grid-cols-2 gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-3 text-parchment/90 hover:bg-midnight-800">
                {n.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {signedIn ? (
              <>
                <Link href="/portal" className="btn-gold">My Guild Status{unread > 0 ? ` · ${unread} new` : ""}</Link>
                {staff && <Link href="/gm" className="btn-arcane">Command Center</Link>}
              </>
            ) : (
              <>
                <Link href="/join" className="btn-gold">Join the Guild</Link>
                <Link href="/join?mode=signin" className="btn-ghost">Sign in</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
