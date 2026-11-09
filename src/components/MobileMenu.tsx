"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MobileMenu({ nav, signedIn, staff, unread }: { nav: { href: string; label: string }[]; signedIn: boolean; staff: boolean; unread: number }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <div className="xl:hidden">
      <button type="button" className="btn-ghost btn-sm" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : "Menu"}
        {unread > 0 && !open && <span className="ml-1 rounded-full bg-arcane px-1.5 text-[10px] text-midnight">{unread}</span>}
      </button>
      {open && (
        <nav id="mobile-nav" className="absolute inset-x-0 top-16 border-b border-arcane/40 bg-midnight-950/95 px-4 pb-6 pt-3 shadow-2xl backdrop-blur-md" aria-label="Mobile">
          <p className="mb-2 font-ui text-[12px] font-bold uppercase tracking-[0.3em] text-arcane/80">【 Menu 】</p>
          <div className="grid grid-cols-2 gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-sm border border-white/5 px-3 py-3 font-ui text-[15px] font-bold uppercase tracking-[0.14em] text-parchment/90 hover:border-arcane/40 hover:bg-arcane/10">
                {n.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {signedIn ? (
              <>
                <Link href="/portal/" className="btn-gold">Status Window{unread > 0 ? ` · ${unread} new` : ""}</Link>
                {staff && <Link href="/gm/" className="btn-arcane">GM Console</Link>}
              </>
            ) : (
              <>
                <Link href="/join/" className="btn-gold">Start Adventure</Link>
                <Link href="/join/?mode=signin" className="btn-ghost">Log in</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
