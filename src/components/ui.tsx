import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children, action }: { eyebrow?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="heading text-3xl sm:text-4xl">{title}</h1>
        <div aria-hidden className="mt-3 flex items-center gap-2">
          <span className="h-px w-16 bg-gradient-to-r from-gold to-transparent" />
          <span className="h-1.5 w-1.5 rotate-45 bg-arcane shadow-[0_0_8px_#46BDD6]" />
          <span className="h-px w-24 bg-gradient-to-r from-arcane/70 to-transparent" />
        </div>
        {children && <div className="muted mt-3 max-w-2xl">{children}</div>}
      </div>
      {action}
    </header>
  );
}

/**
 * The floating "status screen" from isekai stories. `title` shows in the header bar,
 * e.g. <SystemWindow title="Status">.
 */
export function SystemWindow({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel-arcane arcane-shimmer p-0 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-arcane/30 bg-arcane/10 px-5 py-2">
        <p className="font-ui text-[13px] font-bold uppercase tracking-[0.3em] text-arcane-light">
          <span className="text-arcane">【</span> System <span className="text-arcane/60">·</span> {title} <span className="text-arcane">】</span>
        </p>
        {right}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

const TONES: Record<string, string> = {
  // world states
  peaceful: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  threatened: "text-gold-light border-gold/50 bg-gold/10",
  besieged: "text-ember-light border-ember/60 bg-ember/15",
  destroyed: "text-ember-light border-ember/70 bg-ember/20",
  rebuilding: "text-arcane-light border-arcane/50 bg-arcane/10",
  unknown: "text-parchment/70 border-parchment/25 bg-white/5",
  // positive
  open: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  confirmed: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  attended: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  paid: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  approved: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  claimed: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  published: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  // pending
  full: "text-gold-light border-gold/50 bg-gold/10",
  waitlisted: "text-gold-light border-gold/50 bg-gold/10",
  pending_payment: "text-gold-light border-gold/50 bg-gold/10",
  submitted: "text-gold-light border-gold/50 bg-gold/10",
  // info
  unassigned: "text-arcane-light border-arcane/50 bg-arcane/10",
  completed: "text-epic-light border-epic/50 bg-epic/10",
  // inert / negative
  draft: "text-parchment/70 border-parchment/25 bg-white/5",
  locked: "text-parchment/60 border-parchment/20 bg-white/5",
  canceled: "text-parchment/50 border-parchment/20 bg-white/5",
  deactivated: "text-parchment/50 border-parchment/20 bg-white/5",
  no_show: "text-ember-light border-ember/50 bg-ember/10",
  rejected: "text-ember-light border-ember/50 bg-ember/10",
  // rarity
  common: "text-rarity-common border-rarity-common/40 bg-rarity-common/5",
  uncommon: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  rare: "text-rarity-rare border-rarity-rare/50 bg-rarity-rare/10",
  epic: "text-rarity-epic border-rarity-epic/50 bg-rarity-epic/10",
  legendary: "text-rarity-legendary border-rarity-legendary/60 bg-rarity-legendary/10",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-ui text-[12px] font-bold uppercase tracking-[0.14em] ${TONES[status] ?? TONES.draft}`}>
      <span aria-hidden className="h-1 w-1 rotate-45 bg-current" />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

/** Rank tiers get MMO-style colours: F iron → S legendary. */
const RANK_TONE: Record<string, { fg: string; bg: string; glow: string }> = {
  F: { fg: "#d6dae1", bg: "linear-gradient(160deg,#5a6272,#2b313d)", glow: "rgba(201,206,214,.35)" },
  E: { fg: "#c9f7d9", bg: "linear-gradient(160deg,#2f8a57,#123824)", glow: "rgba(74,222,128,.45)" },
  D: { fg: "#c8f1fa", bg: "linear-gradient(160deg,#2b8fa5,#0f3a46)", glow: "rgba(70,189,214,.5)" },
  C: { fg: "#dcc8ff", bg: "linear-gradient(160deg,#7a4fd0,#2c1857)", glow: "rgba(176,124,255,.5)" },
  B: { fg: "#ffe0bd", bg: "linear-gradient(160deg,#c9772a,#4a2508)", glow: "rgba(242,165,65,.5)" },
  A: { fg: "#ffd0c6", bg: "linear-gradient(160deg,#c9412d,#4a0f08)", glow: "rgba(224,83,61,.55)" },
  S: { fg: "#fff6d8", bg: "conic-gradient(from 200deg,#f2a541,#b07cff,#46bdd6,#4ade80,#f2a541)", glow: "rgba(240,215,154,.7)" },
};

export function RankBadge({ code, title, size = "md" }: { code: string; title?: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-16 w-14 text-3xl" : size === "sm" ? "h-8 w-7 text-sm" : "h-11 w-10 text-lg";
  const t = RANK_TONE[code] ?? RANK_TONE.F;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex" style={{ filter: `drop-shadow(0 0 8px ${t.glow})` }}>
        <span
          className={`inline-flex ${dims} items-center justify-center font-display font-bold`}
          style={{ clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)", background: t.bg, color: t.fg, textShadow: "0 1px 2px rgba(0,0,0,.6)" }}
          aria-label={`Rank ${code}`}
        >
          {code}
        </span>
      </span>
      {title && <span className="font-ui text-[15px] font-semibold uppercase tracking-[0.12em] text-parchment/90">{title}</span>}
    </span>
  );
}

const BAR: Record<string, string> = {
  arcane: "linear-gradient(90deg,#2b8fa5,#46bdd6,#8fe3f2)",
  xp: "linear-gradient(90deg,#6b3fd1,#b07cff,#e0c8ff)",
  gold: "linear-gradient(90deg,#a9843d,#d4aa5a,#f6e2ad)",
  ember: "linear-gradient(90deg,#9c2a18,#e0533d,#ff8a6a)",
  hp: "linear-gradient(90deg,#9c2a18,#e0533d,#ff8a6a)",
  forest: "linear-gradient(90deg,#1f7a52,#4ade80,#a7f3c8)",
  mana: "linear-gradient(90deg,#3048c9,#5b7cfa,#a9bcff)",
};

/** MMO resource bar with segment ticks and gloss. */
export function Meter({ label, value, max, tone = "arcane" }: { label: string; value: number; max: number | null; tone?: keyof typeof BAR }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 100;
  return (
    <div>
      <div className="mb-1 flex justify-between font-ui text-[13px] font-bold uppercase tracking-[0.18em] text-parchment/75">
        <span>{label}</span>
        <span className="hud-num text-parchment">
          {value.toLocaleString()}
          {max ? <span className="text-parchment/50"> / {max.toLocaleString()}</span> : ""}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-sm border border-white/10 bg-midnight-950" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemax={max ?? value}>
        <div className="bar-fill h-full rounded-sm" style={{ width: `${pct}%`, background: BAR[tone] ?? BAR.arcane, boxShadow: "0 0 10px rgba(255,255,255,.15)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgba(0,0,0,.45) calc(10% - 1px) 10%)" }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, tone = "gold" }: { label: string; value: ReactNode; tone?: "gold" | "arcane" }) {
  return (
    <div className="relative rounded-sm border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-3 text-center">
      <div className="font-ui text-[12px] font-bold uppercase tracking-[0.22em] text-parchment/60">{label}</div>
      <div className={`hud-num mt-0.5 text-3xl ${tone === "gold" ? "text-gold-light" : "text-arcane-light"}`} style={{ textShadow: tone === "gold" ? "0 0 12px rgba(240,215,154,.35)" : "0 0 12px rgba(143,227,242,.4)" }}>
        {value}
      </div>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-arcane/30 bg-arcane/[0.03] p-8 text-center">
      <p className="font-ui text-[13px] font-bold uppercase tracking-[0.3em] text-arcane/80">【 System 】</p>
      <p className="mt-2 font-display text-lg text-gold-light">{title}</p>
      {children && <div className="muted mx-auto mt-2 max-w-md text-sm">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Portrait({ url, name, className = "h-24 w-24" }: { url: string | null; name: string; className?: string }) {
  const frame = "rounded-md border border-gold/60 shadow-[0_0_0_3px_rgba(7,11,20,1),0_0_0_4px_rgba(212,170,90,.45),0_0_24px_rgba(70,189,214,.25)]";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Portrait of ${name}`} className={`${className} ${frame} object-cover`} />;
  }
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`${className} ${frame} relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,#1f4a66,#0d1424_70%)] font-display text-3xl font-bold text-gold-light`} aria-label={`${name} (no portrait)`}>
      <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-25">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#8FE3F2" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#8FE3F2" strokeWidth="0.4" strokeDasharray="2 3" />
        <path d="M50 10 L84.6 70 L15.4 70 Z M50 90 L15.4 30 L84.6 30 Z" fill="none" stroke="#F0D79A" strokeWidth="0.5" />
      </svg>
      <span className="relative">{initials}</span>
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
