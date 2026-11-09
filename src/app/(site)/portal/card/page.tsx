import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { claimByCode } from "@/app/actions/characters";
import { GuildCard } from "@/components/GuildCard";
import { Flash, PageHeader, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { cardQrSvg } from "@/lib/qr";

export const metadata = { title: "Guild Card" };

export default async function CardPage({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireViewer("/portal/card");
  const card = viewer.card;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Physical membership" title="Your Guild Card" />
      <Flash ok={q.ok} error={q.error} />
      {card ? (
        <>
          <div className="mx-auto max-w-md text-[15px] sm:text-[18px]">
            <GuildCard cardNumber={card.card_number} name={viewer.character?.name ?? viewer.profile.display_name} rank={viewer.totals?.rank_code} tier={card.tier} qrSvg={await cardQrSvg(card.token)} />
          </div>
          <div className="panel mt-6 text-sm">
            <p>When someone scans your card they see your <Link className="link" href={`/adventurers/${card.card_number}`}>verified public profile</Link>. Scanning never signs anyone into your account.</p>
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
          <form action={claimByCode} className="mt-6 grid gap-2">
            <label className="label" htmlFor="code">Camera not cooperating? Enter the code printed under the QR</label>
            <div className="flex gap-2">
              <input id="code" name="code" className="input font-mono" autoComplete="off" required />
              <SubmitButton className="btn-gold">Find card</SubmitButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
