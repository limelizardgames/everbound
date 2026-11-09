"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useData } from "@/lib/useData";
import { GuildCard } from "@/components/GuildCard";
import { Guard, Loading, useTitle } from "@/components/Guard";
import { cardQrSvg } from "@/lib/qr";
import { siteUrl } from "@/lib/env";

type C = { card_number: string; token: string; tier: string; personalized_name: string | null; status: string; character: { name: string } | null };

/** Letter-size sheet, 2 × 5 CR80 cards. Print at 100% scale. */
export default function Page() {
  return (
    <Guard min="game_master">
      <Suspense fallback={<Loading />}><PrintCards /></Suspense>
    </Guard>
  );
}

function PrintCards() {
  useTitle("Print Guild Cards");
  const params = useSearchParams();
  const batch = params.get("batch");
  const status = params.get("status");
  const { data: cards } = useData(async () => {
    let q = sb().from("guild_cards").select("card_number, token, tier, personalized_name, status, character:characters(name)").order("card_number").limit(200);
    if (batch) q = q.eq("batch_label", batch);
    if (status) q = q.eq("status", status);
    const list = (await must(q)) as unknown as C[];
    return Promise.all(list.map(async (c) => ({ ...c, svg: await cardQrSvg(c.token) })));
  }, [batch, status]);
  if (!cards) return <Loading />;
  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-midnight p-4 text-parchment">
        <div>
          <p className="font-display text-lg text-gold-light">{cards.length} cards{batch ? ` · batch ${batch}` : ""}{status ? ` · ${status}` : ""}</p>
          <p className="text-xs text-parchment/70">QR codes point to {siteUrl()}/card/… — make sure that is your permanent address before printing. Print at 100% scale on Letter paper (cards are 3.375&quot; × 2.125&quot;).</p>
        </div>
        <div className="flex gap-2">
          <Link href="/gm/cards/" className="btn-ghost">Back</Link>
          <button type="button" className="btn-gold" onClick={() => window.print()}>Print</button>
        </div>
      </div>
      <div className="mx-auto grid w-fit grid-cols-2 gap-x-[0.25in] gap-y-[0.1in] text-[11px]">
        {cards.map((c) => (
          <GuildCard key={c.card_number} print cardNumber={c.card_number} name={c.character?.name ?? c.personalized_name} tier={c.tier} qrSvg={c.svg} claimCode={c.status === "unassigned" ? c.token : undefined} />
        ))}
      </div>
    </div>
  );
}
