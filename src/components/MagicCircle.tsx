/** Layered summoning circle (pure SVG). Rotates slowly unless reduced motion / Calm mode is on. */
export function MagicCircle({ className = "", tone = "#8FE3F2" }: { className?: string; tone?: string }) {
  const runes = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full animate-spin-slow" style={{ filter: `drop-shadow(0 0 6px ${tone})` }}>
        <defs>
          <path id="mc-ring" d="M200,200 m-168,0 a168,168 0 1,1 336,0 a168,168 0 1,1 -336,0" />
        </defs>
        <circle cx="200" cy="200" r="190" fill="none" stroke={tone} strokeOpacity=".55" strokeWidth="1.2" />
        <circle cx="200" cy="200" r="180" fill="none" stroke={tone} strokeOpacity=".35" strokeWidth=".8" strokeDasharray="2 6" />
        <text fill={tone} fillOpacity=".75" fontSize="15" letterSpacing="9">
          <textPath href="#mc-ring">{runes}{runes}</textPath>
        </text>
        <circle cx="200" cy="200" r="150" fill="none" stroke={tone} strokeOpacity=".5" strokeWidth="1" />
      </svg>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full animate-spin-rev" style={{ filter: `drop-shadow(0 0 4px ${tone})` }}>
        <polygon points="200,58 323,271 77,271" fill="none" stroke={tone} strokeOpacity=".5" strokeWidth="1" />
        <polygon points="200,342 77,129 323,129" fill="none" stroke={tone} strokeOpacity=".5" strokeWidth="1" />
        <circle cx="200" cy="200" r="112" fill="none" stroke="#F0D79A" strokeOpacity=".45" strokeWidth="1" />
        <circle cx="200" cy="200" r="102" fill="none" stroke="#F0D79A" strokeOpacity=".3" strokeWidth=".6" strokeDasharray="10 4 2 4" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={200 + Math.cos(a) * 150} cy={200 + Math.sin(a) * 150} r="3" fill={tone} fillOpacity=".8" />;
        })}
      </svg>
    </div>
  );
}
