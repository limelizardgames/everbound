"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { GuildCard } from "@/components/GuildCard";
import { TiltCard } from "@/components/TiltCard";
import { PageHeader } from "@/components/ui";
import { Loading, useTitle } from "@/components/Guard";
import { cardQrSvg } from "@/lib/qr";

export default function CardPage() {
  useTitle("Guild Card");
  const { viewer } = useViewer();
  const router = useRouter();
  const card = viewer?.card;
  const { data: svg } = useData(async () => cardQrSvg(card!.token), [card?.token], !!card);
  if (!viewer) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Physical membership" title="Your Guild Card" />
      {card ? (
        <>
          <div className="mx-auto max-w-md text-[15px] sm:text-[18px]">
            {svg ? <TiltCard><GuildCard cardNumber={card.card_number} name={viewer.character?.name ?? viewer.profile.display_name} rank={viewer.totals?.rank_code} tier={card.tier} qrSvg={svg} /></TiltCard> : <Loading />}
          </div>
          <div className="panel mt-6 text-sm">
            <p>When someone scans your card they see your <Link className="link" href={`/adventurer/?n=${card.card_number}`}>verified public profile</Link>. Scanning never signs anyone into your account.</p>
            <p className="muted mt-2">Lost your card, or ready for a rank upgrade? Ask a Guild Master to retire this card and issue a new one — your progress stays with you.</p>
          </div>
        </>
      ) : (
        <div className="panel-arcane">
          <h2 className="heading text-xl">Bind your physical card</h2>
          <ol className="muted mt-3 list-inside list-decimal space-y-1 text-sm">
            <li>Pick up a guild card from your Guild Master at the store.</li>
            <li>Scan its QR code with your phone camera.</li>
            <li>Confirm the claim while signed in to this account.</li>
          </ol>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();
              if (code) router.push(`/card/?t=${encodeURIComponent(code)}`);
            }}
            className="mt-6 grid gap-2"
          >
            <label className="label" htmlFor="code">Camera not cooperating? Enter the code printed under the QR</label>
            <div className="flex gap-2">
              <input id="code" name="code" className="input font-mono" autoComplete="off" required />
              <button type="submit" className="btn-gold">Find card</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
