/** Line-art class emblems (48×48). Unknown classes fall back to a star sigil. */
const PATHS: Record<string, React.ReactNode> = {
  warrior: (<><path d="M24 5 L27 30 L24 34 L21 30 Z" /><path d="M16 30 H32" /><path d="M24 34 V42" /><circle cx="24" cy="43" r="1.6" fill="currentColor" /></>),
  ranger: (<><path d="M14 6 C32 14 32 34 14 42" /><path d="M14 6 V42" strokeDasharray="1.5 2.5" /><path d="M8 24 H40" /><path d="M35 20 L40 24 L35 28" /><path d="M8 24 l4 -3 M8 24 l4 3" /></>),
  rogue: (<><path d="M10 8 L27 27 L24 30 Z" /><path d="M38 8 L21 27 L24 30 Z" /><path d="M20 32 L14 40 M28 32 L34 40" /><path d="M17 29 L31 29" opacity=".0" /><circle cx="13" cy="41" r="1.6" fill="currentColor" /><circle cx="35" cy="41" r="1.6" fill="currentColor" /></>),
  cleric: (<><circle cx="24" cy="22" r="8" /><path d="M24 4 V10 M24 34 V44 M6 22 H12 M36 22 H42 M11 9 L15 13 M37 9 L33 13 M11 35 L15 31 M37 35 L33 31" /><path d="M24 18 V26 M20 22 H28" /></>),
  mage: (<><path d="M14 44 L30 14" /><path d="M32 4 L34.5 10 L41 11 L36 15.5 L37.5 22 L32 18.5 L26.5 22 L28 15.5 L23 11 L29.5 10 Z" /><circle cx="12" cy="18" r="1.4" fill="currentColor" /><circle cx="40" cy="32" r="1.4" fill="currentColor" /><circle cx="20" cy="8" r="1" fill="currentColor" /></>),
  bard: (<><path d="M16 8 C8 20 10 34 24 40 C38 34 40 20 32 8" /><path d="M16 8 H32" /><path d="M20 10 V37 M24 10 V40 M28 10 V37" /></>),
};

export function ClassIcon({ name, className = "h-10 w-10" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name] ?? <path d="M24 6 L28.5 18 L41 19 L31.5 27 L34.5 40 L24 33 L13.5 40 L16.5 27 L7 19 L19.5 18 Z" />}
    </svg>
  );
}
