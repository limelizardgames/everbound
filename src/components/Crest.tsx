export function Crest({ className = "h-10 w-10", glow = false }: { className?: string; glow?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="eb-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0D79A" />
          <stop offset="1" stopColor="#A9843D" />
        </linearGradient>
      </defs>
      {glow && <circle cx="32" cy="32" r="30" fill="#46BDD6" opacity=".12" />}
      <path d="M32 4 L54 12 V30 C54 44 44 54 32 60 C20 54 10 44 10 30 V12 Z" fill="#101827" stroke="url(#eb-gold)" strokeWidth="2.5" />
      <path d="M32 12 L46 17 V30 C46 39 40 46 32 50 C24 46 18 39 18 30 V17 Z" fill="none" stroke="#D4AA5A" strokeOpacity=".45" strokeWidth="1" />
      <path d="M32 18 L35 28 L45 28 L37 34 L40 44 L32 38 L24 44 L27 34 L19 28 L29 28 Z" fill="url(#eb-gold)" />
      <circle cx="32" cy="31" r="3" fill="#46BDD6" />
    </svg>
  );
}

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <Crest className={small ? "h-7 w-7" : "h-9 w-9"} />
      <span className="whitespace-nowrap leading-none">
        <span className={`block font-display font-bold tracking-[0.2em] text-gold-light ${small ? "text-base" : "text-lg"}`}>EVERBOUND</span>
        {!small && <span className="block text-[10px] uppercase tracking-[0.3em] text-parchment/60">Adventurers Guild</span>}
      </span>
    </span>
  );
}
