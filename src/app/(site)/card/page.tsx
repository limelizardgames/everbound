"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/env";
import { useData } from "@/lib/useData";
import { useViewer } from "@/lib/viewer";
import { useAct } from "@/lib/toast";
import { claimCard, signUpWithCard } from "@/lib/actions";
import { BirthFields } from "@/components/BirthFields";
import { CharacterProfile } from "@/components/CharacterProfile";
import { Crest } from "@/components/Crest";
import { MagicCircle } from "@/components/MagicCircle";
import { SubmitButton } from "@/components/SubmitButton";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";
import type { PublicCharacter } from "@/lib/types";

type Resolved = { card_number: string; status: "unassigned" | "claimed" | "deactivated"; tier: string; personalized_name: string | null; is_mine: boolean; character: PublicCharacter | null } | null;

/**
 * Target of every printed QR code (/card/?t=TOKEN). Resolves to a claim flow for an
 * unclaimed card or a verified public profile for a claimed one. Never signs anybody in.
 */
export default function Page() {
  return <Suspense fallback={<Loading />}><CardPage /></Suspense>;
}

function CardPage() {
  useTitle("Guild Card");
  const token = useSearchParams().get("t") ?? "";
  const { viewer, loading: vLoading, refresh } = useViewer();
  const act = useAct();
  const { data: minAge } = useData(async () => Number((await sb().from("admin_settings").select("value").eq("key", "min_age").maybeSingle()).data?.value ?? 13), []);
  const { data: card, loading } = useData(async () => (await must(sb().rpc("resolve_guild_card", { p_token: token }))) as Resolved, [token, viewer?.userId]);
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading || vLoading) return <Loading />;
  const next = `/card/?t=${encodeURIComponent(token)}`;

  return (
    <div className="container-eb max-w-3xl py-12">
      {!card ? (
        <Notice title="Card not recognised">This QR code does not match any guild card. If you believe this is a mistake, show the card to a Guild Master.</Notice>
      ) : card.status === "deactivated" ? (
        <Notice title={`Card ${card.card_number} has been retired`}>This guild card is no longer active. It may have been replaced or upgraded. Its holder&apos;s record is safe.</Notice>
      ) : card.status === "unassigned" ? (
        <div className="panel-arcane text-center sm:p-10">
          <div className="relative mx-auto h-40 w-40">
            <MagicCircle className="absolute inset-0" tone="#F0D79A" />
            <Crest className="rune-pulse absolute inset-[28%] h-[44%] w-[44%]" glow />
          </div>
          <p className="mt-3 font-ui text-[13px] font-bold uppercase tracking-[0.3em] text-arcane-light">【 System · Item Detected 】</p>
          <p className="eyebrow mt-2">Unclaimed guild card</p>
          <h1 className="heading mt-2 text-3xl">{card.card_number}</h1>
          {card.personalized_name && <p className="mt-1 text-gold-light">Inscribed for {card.personalized_name}</p>}
          <p className="muted mx-auto mt-3 max-w-md">This card has not been bound to anyone yet. Create your account below and it becomes yours alone: locked to you for good.</p>
          {!viewer ? (
            <form action={act(signUpWithCard, { after: refresh })} className="mx-auto mt-8 grid max-w-md gap-4 text-left">
              <input type="hidden" name="card_token" value={token} />
              <p className="text-center font-display text-xl text-gold-light">Create your account</p>
              <div>
                <label className="label" htmlFor="display_name">Display name</label>
                <input className="input" id="display_name" name="display_name" required minLength={2} maxLength={40} autoComplete="nickname" placeholder="Shown in the Tavern" />
                <p className="muted mt-1 text-xs">Use a nickname. Never your full legal name.</p>
              </div>
              <div><label className="label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
                <p className="muted mt-1 text-xs">You&apos;ll log in with your email and password. The card itself never logs anyone in.</p>
              </div>
              <BirthFields minAge={minAge ?? 13} />
              <SubmitButton pendingText="Binding your card…">▸ Claim card &amp; create account</SubmitButton>
              <p className="muted text-center text-xs">Already have an account? <Link className="link" href={`/join/?next=${encodeURIComponent(next)}`}>Log in</Link> to bind this card to it.</p>
            </form>
          ) : viewer.card ? (
            <p className="mt-6 rounded-lg border border-gold/40 p-3 text-sm">You already hold card <strong>{viewer.card.card_number}</strong>. If this is an upgrade or replacement, a Guild Master can transfer it for you.</p>
          ) : (
            <form action={act(() => claimCard(token), { after: refresh })} className="mt-6">
              <SubmitButton pendingText="Binding…">▸ Bind card to {viewer.profile.display_name}</SubmitButton>
            </form>
          )}
        </div>
      ) : card.character ? (
        <>
          <CharacterProfile c={card.character} cardNumber={card.card_number} />
          {card.is_mine && <p className="mt-4 text-center text-sm"><Link className="link" href="/portal/">Open my Guild Status →</Link></p>}
        </>
      ) : (
        <Notice title={`Card ${card.card_number}`}>
          {card.is_mine ? <>This card is bound to you. <Link className="link" href="/portal/character/new/">Register your adventurer</Link> to complete your profile.</> : <>This card belongs to a Guild member who has not yet registered a public adventurer.</>}
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
