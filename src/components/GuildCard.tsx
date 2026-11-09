import { Crest } from "@/components/Crest";

const TIER: Record<string, string> = {
  founding: "from-[#2a2114] via-[#101827] to-[#2a2114] border-gold",
  standard: "from-midnight-800 via-midnight-900 to-midnight-800 border-gold/70",
  iron: "from-[#2b2f36] via-midnight-900 to-[#2b2f36] border-parchment/40",
  bronze: "from-[#3a2716] via-midnight-900 to-[#3a2716] border-[#c08a4a]",
  silver: "from-[#3a4250] via-midnight-900 to-[#3a4250] border-[#c9d1dc]",
  gold: "from-[#4a3a14] via-midnight-900 to-[#4a3a14] border-gold-light",
  mythril: "from-[#123a44] via-midnight-900 to-[#123a44] border-arcane",
};

/**
 * Physical guild card face (CR80 ratio, 3.375in × 2.125in). Used on screen and on the print sheet.
 * `qrSvg` is generated server-side by the qrcode library from our own card URL.
 */
export function GuildCard({ cardNumber, name, rank, tier = "standard", qrSvg, claimCode, print = false }: {
  cardNumber: string; name?: string | null; rank?: string | null; tier?: string; qrSvg: string; claimCode?: string; print?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[12px] border-2 bg-gradient-to-br text-parchment ${TIER[tier] ?? TIER.standard} ${print ? "" : "shadow-gold"}`}
      style={print ? { width: "3.375in", height: "2.125in", breakInside: "avoid", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } : { aspectRatio: "3.375 / 2.125" }}
    >
      <div className="absolute inset-[5px] rounded-[8px] border border-gold/30" />
      <div className="relative flex h-full p-[7%]">
        <div className="flex flex-1 flex-col justify-between pr-2">
          <div className="flex items-center gap-1.5">
            <Crest className="h-[2.2em] w-[2.2em]" />
            <div className="leading-tight">
              <div className="font-display text-[0.95em] font-bold tracking-[0.18em] text-gold-light">EVERBOUND</div>
              <div className="text-[0.45em] uppercase tracking-[0.25em] text-parchment/70">Adventurers Guild</div>
            </div>
          </div>
          <div>
            <div className="text-[0.45em] uppercase tracking-[0.25em] text-parchment/60">{tier === "founding" ? "Founding Member" : "Guild Member"}</div>
            <div className="font-display text-[1.05em] leading-tight text-parchment">{name || "Adventurer"}</div>
            <div className="mt-0.5 font-mono text-[0.7em] tracking-widest text-gold-light">{cardNumber}</div>
          </div>
          {rank && <div className="text-[0.5em] uppercase tracking-[0.2em] text-arcane-light">Rank {rank}</div>}
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="overflow-hidden rounded-md bg-parchment-light p-[3px] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" style={{ width: "7.4em" }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          {claimCode && <div className="mt-1 max-w-[12.5em] break-all text-center font-mono text-[0.58em] leading-tight text-parchment/70">{claimCode}</div>}
        </div>
      </div>
    </div>
  );
}
