/** Line-art profession emblems (48×48). */
const PATHS: Record<string, React.ReactNode> = {
  blacksmithing: (<><path d="M8 18 H34 C38 18 40 22 40 24 H30 L28 30 H18 L16 24 C10 24 8 22 8 18 Z" /><path d="M18 30 V36 H28 V30" /><path d="M14 40 H32" /><path d="M36 6 L42 12 M33 9 L39 15" /></>),
  alchemy: (<><path d="M19 6 H29 M21 6 V18 L10 38 C9 41 11 43 14 43 H34 C37 43 39 41 38 38 L27 18 V6" /><path d="M14 32 H34" /><circle cx="20" cy="37" r="1.5" fill="currentColor" /><circle cx="27" cy="35" r="1" fill="currentColor" /></>),
  leatherworking: (<><path d="M12 10 C20 6 28 6 36 10 L34 40 C28 43 20 43 14 40 Z" /><path d="M17 14 L31 14 M16 20 L32 20" strokeDasharray="2 2.5" /><path d="M38 4 L28 30" /><circle cx="38" cy="4" r="1.6" /></>),
  cooking: (<><path d="M8 22 H40 V28 C40 36 34 41 24 41 C14 41 8 36 8 28 Z" /><path d="M4 22 H8 M40 22 H44" /><path d="M18 16 C16 12 20 10 18 6 M25 16 C23 12 27 10 25 6 M32 16 C30 12 34 10 32 6" /></>),
  artificing: (<><path d="M24 4 L36 16 L24 44 L12 16 Z" /><path d="M12 16 H36 M24 4 L20 16 L24 44 L28 16 Z" /><circle cx="40" cy="8" r="1.4" fill="currentColor" /><circle cx="7" cy="30" r="1.4" fill="currentColor" /></>),
};
export const PROFESSION_COLOR: Record<string, string> = { blacksmithing: "#E0533D", alchemy: "#4ADE80", leatherworking: "#C08A4A", cooking: "#F2A541", artificing: "#B07CFF" };

export function ProfessionIcon({ name, className = "h-10 w-10" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name] ?? <circle cx="24" cy="24" r="16" />}
    </svg>
  );
}
