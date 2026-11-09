import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { GuildCard } from "@/components/GuildCard";
import { PrintButton } from "@/components/PrintButton";
import { cardQrSvg } from "@/lib/qr";
import { siteUrl } from "@/lib/env";
import { sp, type SP } from "@/components/ui";

export const metadata = { title: "Print Guild Cards", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Letter-size sheet, 2 × 5 CR80 cards with crop gaps. Print at 100% scale. */
export default async function PrintCards({ searchParams }: { searchParams: SP }) {
  await requireRole("game_master", "/gm/cards");
  const q = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("guild_cards").select("card_number, token, tier, personalized_name, status, character:characters(name)").order("card_number").limit(200);
  const batch = sp(q.batch);
  const status = sp(q.status);
  if (batch) query = query.eq("batch_label", batch);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  type C = { card_number: string; token: string; tier: string; personalized_name: string | null; status: string; character: { name: string } | null };
  const cards = await Promise.all(((data ?? []) as unknown as C[]).map(async (c) => ({ ...c, svg: await cardQrSvg(c.token) })));
  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-midnight p-4 text-parchment">
        <div>
          <p className="font-display text-lg text-gold-light">{cards.length} cards{batch ? ` · batch ${batch}` : ""}{status ? ` · ${status}` : ""}</p>
          <p className="text-xs text-parchment/70">QR codes point to {siteUrl()}/card/… — make sure NEXT_PUBLIC_SITE_URL is your live domain before printing. Print at 100% scale on Letter paper (cards are 3.375&quot; × 2.125&quot;).</p>
        </div>
        <PrintButton />
      </div>
      <div className="mx-auto grid w-fit grid-cols-2 gap-x-[0.25in] gap-y-[0.1in] text-[11px]">
        {cards.map((c) => (
          <GuildCard key={c.card_number} print cardNumber={c.card_number} name={c.character?.name ?? c.personalized_name} tier={c.tier} qrSvg={c.svg} claimCode={c.status === "unassigned" ? c.token : undefined} />
        ))}
      </div>
    </div>
  );
}
