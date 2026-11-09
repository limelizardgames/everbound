/**
 * Hero backdrop: a faint cartographer's chart of the realm of Everbound, drawn
 * in gold ink on deep navy, with a grid frame, contour lines, trade routes and
 * the world's real place names. Static — no animation.
 */
// Only places that fall in the open space around the hero window get a name;
// the rest are unlabeled markers. Names show on wide screens only.
const PLACES: { name: string; x: number; y: number; kind?: "city" | "ruin" | "danger"; label?: boolean }[] = [
  { name: "Highmere", x: 600, y: 330, kind: "city", label: true },
  { name: "Old King's Road", x: 640, y: 225, label: true },
  { name: "Northern Watchtower", x: 560, y: 120, kind: "ruin", label: true },
  { name: "The Black Hollow", x: 1150, y: 105, kind: "danger", label: true },
  { name: "Emberfall", x: 640, y: 600, label: true },
  { name: "The Ashen Road", x: 1268, y: 310 },
  { name: "Whisperstone Mines", x: 1262, y: 450 },
  { name: "Silverfen", x: 470, y: 470 },
];

const ROUTES = [
  "M600 330 C 615 290, 630 255, 640 225",
  "M640 225 C 610 180, 585 150, 560 120",
  "M560 120 C 760 60, 980 70, 1150 105",
  "M600 330 C 850 320, 1080 300, 1268 310",
  "M1268 310 C 1280 360, 1275 410, 1262 450",
  "M600 330 C 560 390, 515 430, 470 470",
  "M600 330 C 625 420, 640 520, 640 600",
];

const COAST =
  "M300 560 C 250 480 270 400 340 350 C 400 310 380 250 450 215 C 540 170 610 205 690 170 C 780 130 840 80 950 100 C 1040 116 1080 160 1160 150 C 1250 140 1320 190 1350 260 C 1385 340 1320 400 1350 460 C 1380 520 1320 590 1230 585 C 1140 580 1100 615 1000 605 C 900 595 860 560 760 575 C 660 590 600 630 500 612 C 410 596 350 610 300 560 Z";

const HILL = "M0 -40 C 30 -42 52 -18 48 6 C 44 30 18 44 -10 40 C -40 36 -54 12 -48 -12 C -42 -32 -24 -38 0 -40 Z";

export function HeroAtlas() {
  const gold = "#D4AA5A";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_40%,#13213a_0%,#0b1324_55%,#070b14_100%)]" />
      <svg viewBox="0 0 1440 680" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-60 lg:opacity-100">
        <defs>
          <filter id="atlas-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0.83  0 0 0 0 0.67  0 0 0 0 0.35  0 0 0 0.09 0" />
          </filter>
          <pattern id="atlas-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="7" stroke={gold} strokeOpacity="0.07" strokeWidth="1" />
          </pattern>
          <clipPath id="atlas-sea"><rect width="1440" height="680" /></clipPath>
        </defs>

        {/* graticule */}
        <g stroke="#8FE3F2" strokeOpacity="0.06" strokeWidth="1">
          {Array.from({ length: 13 }).map((_, i) => <line key={`v${i}`} x1={60 + i * 110} y1="30" x2={60 + i * 110} y2="650" />)}
          {Array.from({ length: 6 }).map((_, i) => <line key={`h${i}`} x1="40" y1={70 + i * 110} x2="1400" y2={70 + i * 110} />)}
        </g>

        {/* sea hatching hugging the coast, like an engraved chart */}
        <path d={COAST} fill="none" stroke="url(#atlas-hatch)" strokeWidth="46" />
        {/* land */}
        <path d={COAST} fill="#0f1a2e" fillOpacity="0.85" />
        <path d={COAST} fill="none" stroke={gold} strokeOpacity="0.38" strokeWidth="1.4" />
        <path d={COAST} fill="none" stroke={gold} strokeOpacity="0.14" strokeWidth="1" strokeDasharray="2 5" transform="translate(720 360) scale(1.035) translate(-720 -360)" />

        {/* contour hills */}
        {[
          [930, 190, 1.7], [1330, 210, 0.9], [470, 290, 1.0],
        ].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${i * 37})`} fill="none" stroke={gold}>
            {[1, 0.78, 0.56, 0.34].map((k, j) => (
              <path key={j} d={HILL} transform={`scale(${s * k * 1.4} ${s * k})`} strokeOpacity={0.1 + j * 0.03} strokeWidth={1 / (s * k)} />
            ))}
          </g>
        ))}

        {/* Silverfen marsh & river */}
        <path d="M430 455 C 460 435 520 445 530 470 C 540 495 490 510 455 500 C 425 491 415 470 430 455 Z" fill="#8FE3F2" fillOpacity="0.05" stroke="#8FE3F2" strokeOpacity="0.25" />
        <path d="M540 300 C 520 360 500 410 480 455" fill="none" stroke="#8FE3F2" strokeOpacity="0.25" strokeWidth="1.2" />

        {/* trade routes */}
        <g fill="none" stroke={gold} strokeOpacity="0.45" strokeWidth="1.3" strokeDasharray="1 7" strokeLinecap="round">
          {ROUTES.map((d) => <path key={d} d={d} />)}
        </g>

        {/* places */}
        {PLACES.map((p) => (
          <g key={p.name} transform={`translate(${p.x} ${p.y})`}>
            {p.kind === "city" ? (
              <>
                <circle r="7" fill="none" stroke={gold} strokeOpacity="0.7" />
                <circle r="2.5" fill={gold} fillOpacity="0.85" />
              </>
            ) : p.kind === "danger" ? (
              <path d="M0 -6 L6 0 L0 6 L-6 0 Z" fill="#E0533D" fillOpacity="0.55" />
            ) : p.kind === "ruin" ? (
              <path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke="#E0533D" strokeOpacity="0.6" strokeWidth="1.6" />
            ) : (
              <path d="M0 -4 L4 0 L0 4 L-4 0 Z" fill={gold} fillOpacity="0.6" />
            )}
            {p.label && (
              <text x="12" y="4" className="hidden xl:inline" fill="#E9DCC3" fillOpacity={p.kind === "city" ? 0.55 : 0.32} fontFamily="Cinzel, serif" fontSize={p.kind === "city" ? 15 : 12} letterSpacing="3">
                {p.name.toUpperCase()}
              </text>
            )}
          </g>
        ))}

        {/* compass rose */}
        <g transform="translate(1350 590) scale(0.8)" fill="none" stroke={gold} strokeOpacity="0.35">
          <circle r="40" /><circle r="31" strokeDasharray="2 3" />
          <path d="M0 -52 L7 -7 L0 0 L-7 -7 Z" fill={gold} fillOpacity="0.35" />
          <path d="M0 52 L7 7 L0 0 L-7 7 Z" />
          <path d="M-52 0 L-7 -7 L0 0 L-7 7 Z" /><path d="M52 0 L7 -7 L0 0 L7 7 Z" />
          <text y="-58" textAnchor="middle" fill={gold} fillOpacity="0.5" stroke="none" fontFamily="Cinzel, serif" fontSize="12">N</text>
        </g>

        {/* chart frame with degree ticks */}
        <g stroke={gold} strokeOpacity="0.22" fill="none">
          <rect x="24" y="24" width="1392" height="632" />
          <rect x="31" y="31" width="1378" height="618" strokeOpacity="0.12" />
          {Array.from({ length: 35 }).map((_, i) => <line key={`t${i}`} x1={24 + i * 40} y1="24" x2={24 + i * 40} y2={i % 5 === 0 ? 36 : 30} />)}
          {Array.from({ length: 35 }).map((_, i) => <line key={`b${i}`} x1={24 + i * 40} y1="656" x2={24 + i * 40} y2={i % 5 === 0 ? 644 : 650} />)}
        </g>

        <rect width="1440" height="680" filter="url(#atlas-grain)" />
      </svg>
      {/* keep the headline readable: darken behind the left column and the bottom edge */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,11,20,.9)_0%,rgba(7,11,20,.6)_36%,rgba(7,11,20,.1)_55%,rgba(7,11,20,.25)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-midnight-950 to-transparent" />
    </div>
  );
}
