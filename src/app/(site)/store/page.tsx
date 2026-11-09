"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/env";
import { useData } from "@/lib/useData";
import { useViewer } from "@/lib/viewer";
import { useAct } from "@/lib/toast";
import { buyWithGold, orderProduct } from "@/lib/actions";
import { PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";
import { money } from "@/lib/format";

export default function Page() {
  return <Suspense fallback={<Loading />}><StorePage /></Suspense>;
}

function StorePage() {
  useTitle("Guild Store");
  const tab = useSearchParams().get("tab") === "exchange" ? "exchange" : "supply";
  if (!isSupabaseConfigured) return <SetupNotice />;
  return (
    <div className="container-eb py-12">
      <PageHeader eyebrow="Guild Store" title={tab === "supply" ? "Guild Supply Shop" : "Arcane Exchange"}>
        {tab === "supply" ? "Physical goods, collectibles and card upgrades. Pick up at the partner store." : "Spend in-world gold on equipment and cosmetics. Gold is earned at the table — it can never be bought."}
      </PageHeader>
      <div className="mb-8 grid max-w-md grid-cols-2 rounded-lg border border-gold/30 p-1 text-sm">
        <Link href="/store/" className={`rounded-md py-2 text-center ${tab === "supply" ? "bg-gold font-semibold text-midnight" : "text-parchment/70"}`}>Supply Shop · $</Link>
        <Link href="/store/?tab=exchange" className={`rounded-md py-2 text-center ${tab === "exchange" ? "bg-arcane font-semibold text-midnight" : "text-parchment/70"}`}>Arcane Exchange · Gold</Link>
      </div>
      {tab === "supply" ? <Supply /> : <Exchange />}
    </div>
  );
}

type Product = { id: string; name: string; description: string; category: string; price_cents: number; stock: number | null };
type Item = { id: string; name: string; description: string; item_type: string; rarity: string; gold_price: number; requires_flag: string | null };

function Supply() {
  const { viewer } = useViewer();
  const act = useAct();
  const { data } = useData(async () => {
    const [products, mode] = await Promise.all([
      must(sb().from("products").select("*").eq("is_active", true).order("price_cents")),
      must(sb().from("admin_settings").select("value").eq("key", "store_payments").maybeSingle()),
    ]);
    return { products: products as Product[], online: mode?.value === "stripe" };
  }, []);
  if (!data) return <Loading />;
  return (
    <>
      {!data.online && <p className="muted mb-4 text-sm">Orders are reserved online and paid when you pick them up at the store.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.products.map((p) => (
          <div key={p.id} className="panel flex flex-col">
            <p className="eyebrow">{p.category}</p>
            <h2 className="mt-2 font-display text-xl text-gold-light">{p.name}</h2>
            <p className="muted mt-1 flex-1 text-sm">{p.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="hud-num text-2xl text-parchment">{money(p.price_cents)}</span>
              {p.stock !== null && p.stock <= 0 ? <StatusPill status="canceled" label="sold out" /> : p.stock !== null && p.stock < 10 ? <span className="text-xs text-gold">Only {p.stock} left</span> : null}
            </div>
            {viewer ? (
              <form action={act(orderProduct)} className="mt-3 flex gap-2">
                <input type="hidden" name="product_id" value={p.id} />
                <label className="sr-only" htmlFor={`q-${p.id}`}>Quantity</label>
                <input id={`q-${p.id}`} name="quantity" type="number" min={1} max={10} defaultValue={1} className="input w-20" />
                <SubmitButton className="btn-gold flex-1" pendingText="…">{data.online ? "Buy" : "Reserve"}</SubmitButton>
              </form>
            ) : (
              <Link href="/join/?next=/store/" className="btn-ghost mt-3">Sign in to order</Link>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Exchange() {
  const { viewer, refresh } = useViewer();
  const act = useAct();
  const { data: items } = useData(async () => (await must(sb().from("items").select("*").eq("is_active", true).not("gold_price", "is", null).order("gold_price"))) as Item[], []);
  if (!items) return <Loading />;
  const charId = viewer?.character?.id;
  return (
    <>
      {viewer?.totals && <p className="mb-4 text-sm">Your purse: <span className="font-display text-xl text-gold-light">{viewer.totals.gold}</span> gold</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div key={i.id} className="panel-arcane flex flex-col">
            <div className="flex items-center justify-between"><p className="eyebrow">{i.item_type}</p><StatusPill status={i.rarity} /></div>
            <h2 className={`mt-2 font-display text-xl rarity-${i.rarity}`}>{i.name}</h2>
            <p className="muted mt-1 flex-1 text-sm">{i.description}</p>
            {i.requires_flag && <p className="mt-2 text-xs text-gold">Availability depends on events in the world.</p>}
            <div className="mt-4 flex items-center justify-between">
              <span className="hud-num text-2xl text-gold-light">{i.gold_price} <span className="text-base">G</span></span>
              {charId ? (
                <form action={act(() => buyWithGold(i.id, charId), { after: refresh })}>
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
