import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured, isStripeConfigured } from "@/lib/env";
import { buyWithGold, orderProduct } from "@/app/actions/store";
import { Flash, PageHeader, StatusPill, sp, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { SetupNotice } from "@/components/SetupNotice";
import { money } from "@/lib/format";

export const metadata = { title: "Guild Store" };
export const dynamic = "force-dynamic";

export default async function StorePage({ searchParams }: { searchParams: SP }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const q = await searchParams;
  const tab = sp(q.tab) === "exchange" ? "exchange" : "supply";
  const supabase = await createClient();
  const viewer = await getViewer();
  return (
    <div className="container-eb py-12">
      <PageHeader eyebrow="Guild Store" title={tab === "supply" ? "Guild Supply Shop" : "Arcane Exchange"}>
        {tab === "supply"
          ? "Physical goods, collectibles and card upgrades. Pick up at the partner store."
          : "Spend in-world gold on equipment and cosmetics. Gold is earned at the table — it can never be bought."}
      </PageHeader>
      <Flash ok={q.ok} error={q.error} />
      <div className="mb-8 grid max-w-md grid-cols-2 rounded-lg border border-gold/30 p-1 text-sm">
        <Link href="/store" className={`rounded-md py-2 text-center ${tab === "supply" ? "bg-gold font-semibold text-midnight" : "text-parchment/70"}`}>Supply Shop · $</Link>
        <Link href="/store?tab=exchange" className={`rounded-md py-2 text-center ${tab === "exchange" ? "bg-arcane font-semibold text-midnight" : "text-parchment/70"}`}>Arcane Exchange · Gold</Link>
      </div>
      {tab === "supply" ? <Supply signedIn={!!viewer} supabase={supabase} /> : <Exchange gold={viewer?.totals?.gold ?? null} hasChar={!!viewer?.character} supabase={supabase} />}
    </div>
  );
}

type DB = Awaited<ReturnType<typeof createClient>>;

async function Supply({ signedIn, supabase }: { signedIn: boolean; supabase: DB }) {
  const { data } = await supabase.from("products").select("*").eq("is_active", true).order("price_cents");
  return (
    <>
      {!isStripeConfigured && <p className="muted mb-4 text-sm">Online payment is not enabled yet — orders are reserved and paid at pickup.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((p) => (
          <div key={p.id} className="panel flex flex-col">
            <p className="eyebrow">{p.category}</p>
            <h2 className="mt-2 font-display text-xl text-gold-light">{p.name}</h2>
            <p className="muted mt-1 flex-1 text-sm">{p.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-display text-2xl">{money(p.price_cents)}</span>
              {p.stock !== null && p.stock <= 0 ? <StatusPill status="canceled" label="sold out" /> : p.stock !== null && p.stock < 10 ? <span className="text-xs text-gold">Only {p.stock} left</span> : null}
            </div>
            {signedIn ? (
              <form action={orderProduct} className="mt-3 flex gap-2">
                <input type="hidden" name="product_id" value={p.id} />
                <label className="sr-only" htmlFor={`q-${p.id}`}>Quantity</label>
                <input id={`q-${p.id}`} name="quantity" type="number" min={1} max={10} defaultValue={1} className="input w-20" />
                <SubmitButton className="btn-gold flex-1" pendingText="…">{isStripeConfigured ? "Buy" : "Reserve"}</SubmitButton>
              </form>
            ) : (
              <Link href="/join?next=/store" className="btn-ghost mt-3">Sign in to order</Link>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

async function Exchange({ gold, hasChar, supabase }: { gold: number | null; hasChar: boolean; supabase: DB }) {
  const { data: items } = await supabase.from("items").select("*").eq("is_active", true).not("gold_price", "is", null).order("gold_price");
  return (
    <>
      {gold !== null && <p className="mb-4 text-sm">Your purse: <span className="font-display text-xl text-gold-light">{gold}</span> gold</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(items ?? []).map((i) => (
          <div key={i.id} className="panel-arcane flex flex-col">
            <div className="flex items-center justify-between"><p className="eyebrow">{i.item_type}</p><StatusPill status={i.rarity === "common" ? "draft" : "unassigned"} label={i.rarity} /></div>
            <h2 className="mt-2 font-display text-xl text-gold-light">{i.name}</h2>
            <p className="muted mt-1 flex-1 text-sm">{i.description}</p>
            {i.requires_flag && <p className="mt-2 text-xs text-gold">Availability depends on events in the world.</p>}
            <div className="mt-4 flex items-center justify-between">
              <span className="font-display text-2xl text-arcane-light">{i.gold_price} g</span>
              {hasChar ? (
                <form action={buyWithGold}>
                  <input type="hidden" name="item_id" value={i.id} />
                  <SubmitButton className="btn-arcane btn-sm" pendingText="…">Trade</SubmitButton>
                </form>
              ) : (
                <span className="muted text-xs">Adventurers only</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
