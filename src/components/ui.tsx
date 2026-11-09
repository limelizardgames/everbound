import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children, action }: { eyebrow?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="heading text-3xl sm:text-4xl">{title}</h1>
        {children && <div className="muted mt-2 max-w-2xl">{children}</div>}
      </div>
      {action}
    </header>
  );
}

const LOCATION_TONE: Record<string, string> = {
  peaceful: "bg-forest/25 text-forest-light border-forest/50",
  threatened: "bg-gold/15 text-gold-light border-gold/40",
  besieged: "bg-ember/20 text-ember border-ember/50",
  destroyed: "bg-ember/25 text-ember border-ember/60",
  rebuilding: "bg-arcane/15 text-arcane-light border-arcane/40",
  unknown: "bg-midnight-700 text-parchment/70 border-midnight-600",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone =
    LOCATION_TONE[status] ??
    ({
      open: "bg-forest/25 text-forest-light border-forest/50",
      confirmed: "bg-forest/25 text-forest-light border-forest/50",
      attended: "bg-forest/25 text-forest-light border-forest/50",
      paid: "bg-forest/25 text-forest-light border-forest/50",
      approved: "bg-forest/25 text-forest-light border-forest/50",
      claimed: "bg-forest/25 text-forest-light border-forest/50",
      published: "bg-forest/25 text-forest-light border-forest/50",
      full: "bg-gold/15 text-gold-light border-gold/40",
      waitlisted: "bg-gold/15 text-gold-light border-gold/40",
      pending_payment: "bg-gold/15 text-gold-light border-gold/40",
      submitted: "bg-gold/15 text-gold-light border-gold/40",
      draft: "bg-midnight-700 text-parchment/70 border-midnight-600",
      unassigned: "bg-arcane/15 text-arcane-light border-arcane/40",
      locked: "bg-midnight-700 text-parchment/60 border-midnight-600",
      canceled: "bg-midnight-700 text-parchment/50 border-midnight-600",
      deactivated: "bg-midnight-700 text-parchment/50 border-midnight-600",
      no_show: "bg-ember/20 text-ember border-ember/50",
      rejected: "bg-ember/20 text-ember border-ember/50",
      completed: "bg-arcane/15 text-arcane-light border-arcane/40",
    } as Record<string, string>)[status] ??
    "bg-midnight-700 text-parchment/70 border-midnight-600";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tone}`}>
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function RankBadge({ code, title, size = "md" }: { code: string; title?: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-14 w-14 text-2xl" : size === "sm" ? "h-7 w-7 text-xs" : "h-10 w-10 text-base";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-flex ${dims} items-center justify-center rounded-md border border-gold/60 bg-gradient-to-b from-gold/30 to-gold/5 font-display font-bold text-gold-light`}>
        {code}
      </span>
      {title && <span className="text-sm font-semibold text-parchment/85">{title}</span>}
    </span>
  );
}

export function Meter({ label, value, max, tone = "arcane" }: { label: string; value: number; max: number | null; tone?: "arcane" | "gold" | "ember" | "forest" }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 100;
  const bar = { arcane: "bg-arcane", gold: "bg-gold", ember: "bg-ember", forest: "bg-forest-light" }[tone];
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs uppercase tracking-wider text-parchment/70">
        <span>{label}</span>
        <span className="font-semibold text-parchment">
          {value.toLocaleString()}
          {max ? ` / ${max.toLocaleString()}` : ""}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-midnight-700" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemax={max ?? value}>
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, tone = "gold" }: { label: string; value: ReactNode; tone?: "gold" | "arcane" }) {
  return (
    <div className="rounded-lg border border-midnight-600 bg-midnight-950/60 p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-parchment/60">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${tone === "gold" ? "text-gold-light" : "text-arcane-light"}`}>{value}</div>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gold/30 p-8 text-center">
      <p className="font-display text-lg text-gold-light">{title}</p>
      {children && <div className="muted mx-auto mt-2 max-w-md text-sm">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Portrait({ url, name, className = "h-24 w-24" }: { url: string | null; name: string; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Portrait of ${name}`} className={`${className} rounded-xl border border-gold/40 object-cover`} />;
  }
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`${className} flex items-center justify-center rounded-xl border border-gold/40 bg-gradient-to-br from-midnight-700 via-midnight-800 to-arcane/20 font-display text-3xl font-bold text-gold-light`} aria-label={`${name} (no portrait)`}>
      {initials}
    </div>
  );
}

export function CTA({ href, children, variant = "gold" }: { href: string; children: ReactNode; variant?: "gold" | "ghost" | "arcane" }) {
  return (
    <Link href={href} className={variant === "gold" ? "btn-gold" : variant === "arcane" ? "btn-arcane" : "btn-ghost"}>
      {children}
    </Link>
  );
}
