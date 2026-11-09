/** Isekai night sky: moons, twinkling stars, distant peaks and a floating island citadel. Pure SVG/CSS. */
export function SkyScene() {
  const stars = [
    [8, 12], [18, 30], [27, 8], [35, 22], [44, 6], [52, 18], [61, 9], [69, 28], [77, 14], [86, 6], [92, 24], [14, 46], [83, 40], [58, 36], [5, 30], [96, 50],
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050816_0%,#0b1430_40%,#16234a_70%,#1b2a4a_100%)]" />
      <div className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(60%_60%_at_70%_20%,rgba(176,124,255,.22),transparent_70%),radial-gradient(50%_50%_at_20%_30%,rgba(70,189,214,.18),transparent_70%)]" />
      {stars.map(([x, y], i) => (
        <span key={i} className="absolute h-[2px] w-[2px] animate-twinkle rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 6) * 0.5}s` }} />
      ))}
      {/* twin moons */}
      <div className="absolute right-[10%] top-[10%] h-20 w-20 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff8e6,#f0d79a_45%,#b88a3a_75%)] opacity-90 shadow-[0_0_60px_10px_rgba(240,215,154,.25)] sm:h-28 sm:w-28" />
      <div className="absolute right-[24%] top-[6%] h-8 w-8 rounded-full bg-[radial-gradient(circle_at_35%_35%,#e8f9ff,#8fe3f2_50%,#2b8fa5_85%)] opacity-80 shadow-[0_0_30px_6px_rgba(143,227,242,.3)]" />
      <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[70%] w-full">
        <defs>
          <linearGradient id="sky-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3b66" /><stop offset="1" stopColor="#141e38" /></linearGradient>
          <linearGradient id="sky-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#141f3a" /><stop offset="1" stopColor="#070b14" /></linearGradient>
          <linearGradient id="island" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#24365e" /><stop offset="1" stopColor="#0d1424" /></linearGradient>
        </defs>
        {/* floating island with citadel */}
        <g className="animate-float" style={{ transformOrigin: "center" }}>
          <path d="M1010 150 q60 -18 130 0 q-10 40 -45 70 q-25 25 -40 60 q-15 -35 -40 -60 q-30 -30 -5 -70z" fill="url(#island)" />
          <path d="M1040 150 v-40 h10 v-18 l8 -14 l8 14 v18 h10 v40 z M1075 150 v-62 l10 -18 l10 18 v62 z M1100 150 v-34 h12 v34z" fill="#1c2b4d" />
          <circle cx="1085" cy="78" r="3" fill="#8fe3f2" />
          <path d="M1082 230 l3 60 l3 -60" stroke="#8fe3f2" strokeOpacity=".35" strokeWidth="2" />
        </g>
        <path d="M0 300 L120 210 L210 260 L330 160 L450 250 L560 190 L700 270 L820 200 L960 280 L1080 210 L1220 270 L1340 200 L1440 250 V420 H0Z" fill="url(#sky-far)" opacity=".85" />
        <path d="M0 360 L160 290 L300 340 L420 280 L600 350 L760 300 L900 360 L1060 300 L1220 350 L1360 310 L1440 340 V420 H0Z" fill="url(#sky-near)" />
        {/* guild hall on the ridge */}
        <path d="M640 320 v-46 l14 -12 v-22 l10 -16 l10 16 v22 l14 12 v46z M600 320 v-26 l14 -10 l14 10 v26z M700 320 v-30 l12 -10 l12 10 v30z" fill="#0a1020" />
        <rect x="660" y="282" width="4" height="7" fill="#f0d79a" /><rect x="618" y="300" width="3" height="5" fill="#f0d79a" /><rect x="709" y="300" width="3" height="5" fill="#f0d79a" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-midnight-950 to-transparent" />
    </div>
  );
}
