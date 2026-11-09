import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { claimCard } from "@/app/actions/cards";
import { CharacterProfile } from "@/components/CharacterProfile";
import { Crest } from "@/components/Crest";
import { Flash, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { SetupNotice } from "@/components/SetupNotice";
import type { PublicCharacter } from "@/lib/types";

export const metadata = { title: "Guild Card", robots: { index: false } };

type Resolved = { card_number: string; status: "unassigned" | "claimed" | "deactivated"; tier: string; personalized_name: string | null; is_mine: boolean; character: PublicCharacter | null } | null;

/**
 * Target of every printed QR code. Resolves to a claim flow (unclaimed card) or a
 * verified public profile (claimed card). It never signs anybody in.
 */
export default async function CardPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: SP }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { token } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data }, viewer] = await Promise.all([supabase.rpc("resolve_guild_card", { p_token: token }), getViewer()]);
  const card = data as Resolved;
  const next = `/card/${encodeURIComponent(token)}`;

  return (
    <div className="container-eb max-w-3xl py-12">
      <Flash ok={query.ok} error={query.error} />
      {!card ? (
        <Notice title="Card not recognised">This QR code does not match any guild card. If you believe this is a mistake, show the card to a Guild Master.</Notice>
      ) : card.status === "deactivated" ? (
        <Notice title={`Card ${card.card_number} has been retired`}>This guild card is no longer active. It may have been replaced or upgraded. Its holder&apos;s record is safe.</Notice>
      ) : card.status === "unassigned" ? (
        <div className="panel-arcane text-center sm:p-10">
          <Crest className="rune-pulse mx-auto h-20 w-20" glow />
          <p className="eyebrow mt-4">Unclaimed guild card</p>
          <h1 className="heading mt-2 text-3xl">{card.card_number}</h1>
          {card.personalized_name && <p className="mt-1 text-gold-light">Inscribed for {card.personalized_name}</p>}
          <p className="muted mx-auto mt-3 max-w-md">This card has not yet been bound to an adventurer. Whoever holds it may claim it. Once claimed, it is yours alone.</p>
          {!viewer ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link className="btn-gold" href={`/join?mode=signup&next=${encodeURIComponent(next)}`}>Create account &amp; claim</Link>
              <Link className="btn-ghost" href={`/join?mode=signin&next=${encodeURIComponent(next)}`}>Sign in to claim</Link>
            </div>
          ) : viewer.card ? (
            <p className="mt-6 rounded-lg border border-gold/40 p-3 text-sm">
              You already hold card <strong>{viewer.card.card_number}</strong>. If this is an upgrade or replacement, a Guild Master can transfer it for you.
            </p>
          ) : (
            <form action={claimCard} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <SubmitButton pendingText="Binding…">Bind this card to {viewer.profile.display_name}</SubmitButton>
            </form>
          )}
        </div>
      ) : card.character ? (
        <>
          <CharacterProfile c={card.character} cardNumber={card.card_number} />
          {card.is_mine && <p className="mt-4 text-center text-sm"><Link className="link" href="/portal">Open my Guild Status →</Link></p>}
        </>
      ) : (
        <Notice title={`Card ${card.card_number}`}>
          {card.is_mine ? (
            <>This card is bound to you. <Link className="link" href="/portal/character/new">Register your adventurer</Link> to complete your profile.</>
          ) : (
            <>This card belongs to a Guild member who has not yet registered a public adventurer.</>
          )}
        </Notice>
      )}
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel text-center sm:p-10">
      <Crest className="mx-auto h-16 w-16" />
      <h1 className="heading mt-4 text-2xl">{title}</h1>
      <p className="muted mx-auto mt-3 max-w-md">{children}</p>
    </div>
  );
}
