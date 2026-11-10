"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/env";
import { useData } from "@/lib/useData";
import { useViewer, isStaff } from "@/lib/viewer";
import { useAct } from "@/lib/toast";
import { cancelAuction, createAuction, placeBid } from "@/lib/actions";
import { Empty, PageHeader, RankBadge, StatusPill, SystemWindow } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";

type Auction = {
  id: string; item_id: string; item_name: string; item_description: string | null; item_type: string; rarity: string; quantity: number;
  start_price: number; buy_now_price: number | null; current_bid: number | null; min_next_bid: number; bid_count: number; status: string;
  final_price: number | null; ends_at: string; seller_name: string; is_mine: boolean; i_am_top: boolean;
};
type Owned = { quantity: number; item: { id: string; name: string; rarity: string; is_tradeable: boolean } };
const RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS"];

export default function Page() {
  return <Suspense fallback={<Loading />}><AuctionHall /></Suspense>;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}
function timeLeft(endsAt: string, now: number) {
  const s = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  if (s <= 0) return "Ending…";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h >= 1 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

function AuctionHall() {
  useTitle("Auction Hall");
  const tab = useSearchParams().get("tab") === "mine" ? "mine" : "active";
  const { viewer, refresh } = useViewer();
  const act = useAct();
  const now = useNow();
  const charId = viewer?.character?.id;
  const { data, reload } = useData(async () => {
    const [auctions, settings, owned] = await Promise.all([
      must(sb().rpc("get_auctions", { p_tab: tab })),
      must(sb().from("admin_settings").select("key, value").in("key", ["auction_min_rank", "auction_listing_fee", "auction_fee_percent"])),
      charId ? must(sb().from("inventory_balances").select("quantity, item:items(id, name, rarity, is_tradeable)").eq("character_id", charId)) : Promise.resolve([]),
    ]);
    const set = Object.fromEntries((settings as { key: string; value: unknown }[]).map((s) => [s.key, s.value]));
    return { auctions: auctions as Auction[], minRank: String(set.auction_min_rank ?? "E"), listFee: Number(set.auction_listing_fee ?? 2), cut: Number(set.auction_fee_percent ?? 5), owned: (owned as unknown as Owned[]).filter((o) => o.item.is_tradeable) };
  }, [tab, charId]);
  // Refresh when an auction on screen runs out, so settlement shows up.
  const soonest = data?.auctions.filter((a) => a.status === "active").map((a) => new Date(a.ends_at).getTime()).sort()[0];
  useEffect(() => { if (soonest && now > soonest + 1500) reload(); }, [now, soonest, reload]);

  if (!isSupabaseConfigured) return <SetupNotice />;
  const after = { after: async () => { await reload(); await refresh(); } };
  const myRank = viewer?.totals?.rank_code;
  const unlocked = !!myRank && !!data && RANKS.indexOf(myRank) >= RANKS.indexOf(data.minRank);
  const staff = isStaff(viewer);

  return (
    <div className="container-eb py-12">
      <PageHeader eyebrow="Player market · Gold only" title="The Auction Hall" action={viewer?.totals && <span className="hud-num rounded-sm border border-gold/40 bg-gold/10 px-3 py-1.5 text-lg text-gold-light">{viewer.totals.gold.toLocaleString()} G</span>}>
        Sell the gear you don&apos;t need and bid on what you missed. Items and gold are held safely in escrow, and every sale is recorded in the Guild ledgers.
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link href="/auction/" className={`btn-sm ${tab === "active" ? "btn-gold" : "btn-ghost"}`}>Browse</Link>
        <Link href="/auction/?tab=mine" className={`btn-sm ${tab === "mine" ? "btn-gold" : "btn-ghost"}`}>My bids &amp; listings</Link>
        <Link href="/store/?tab=exchange" className="btn-arcane btn-sm">Arcane Exchange ▸</Link>
      </div>

      {!data ? <Loading /> : (
        <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
          <div>
            {data.auctions.length === 0 ? (
              <Empty title={tab === "mine" ? "No bids or listings yet" : "The hall is quiet"}>{tab === "mine" ? "Your auctions and bids will appear here." : "No items are up for auction right now. Be the first to list one."}</Empty>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.auctions.map((a) => {
                  const active = a.status === "active";
                  const ending = active && new Date(a.ends_at).getTime() - now < 3600_000;
                  return (
                    <li key={a.id} className={`panel flex flex-col ${a.i_am_top && active ? "border-rarity-uncommon/60" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-ui text-[12px] font-bold uppercase tracking-[0.2em] text-arcane-light/80">{a.item_type}</span>
                        <StatusPill status={a.rarity} />
                      </div>
                      <h2 className={`mt-1 font-display text-xl rarity-${a.rarity}`}>{a.item_name}{a.quantity > 1 && <span className="hud-num text-parchment/60"> ×{a.quantity}</span>}</h2>
                      <p className="muted mt-1 line-clamp-2 flex-1 text-sm">{a.item_description}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-ui text-[13px] font-semibold uppercase tracking-[0.1em]">
                        <dt className="text-parchment/55">{active ? (a.current_bid ? "Current bid" : "Starting bid") : "Result"}</dt>
                        <dd className="hud-num text-right text-lg text-gold-light">{active ? `${a.current_bid ?? a.start_price} G` : a.status === "sold" ? `${a.final_price} G` : a.status}</dd>
                        {active && a.buy_now_price && (<><dt className="text-parchment/55">Buy now</dt><dd className="hud-num text-right text-arcane-light">{a.buy_now_price} G</dd></>)}
                        <dt className="text-parchment/55">{active ? "Time left" : "Bids"}</dt>
                        <dd className={`hud-num text-right ${ending ? "text-ember-light" : "text-parchment"}`}>{active ? timeLeft(a.ends_at, now) : a.bid_count}</dd>
                        <dt className="text-parchment/55">Seller</dt>
                        <dd className="truncate text-right normal-case tracking-normal text-parchment">{a.is_mine ? "You" : a.seller_name}{active ? ` · ${a.bid_count} bid${a.bid_count === 1 ? "" : "s"}` : ""}</dd>
                      </dl>
                      {active && (
                        <div className="mt-4 border-t border-white/10 pt-3">
                          {a.is_mine ? (
                            <div className="flex items-center justify-between gap-2">
                              <StatusPill status="unassigned" label="Your listing" />
                              {a.bid_count === 0 && <form action={act(() => cancelAuction(a.id), after)}><SubmitButton className="btn-danger btn-sm" confirm="Cancel this listing? The listing fee is not refunded.">Cancel</SubmitButton></form>}
                            </div>
                          ) : a.i_am_top ? (
                            <StatusPill status="confirmed" label="You are the highest bidder" />
                          ) : !viewer ? (
                            <Link href="/join/?next=/auction/" className="btn-ghost btn-sm w-full">Sign in to bid</Link>
                          ) : !unlocked || !charId ? (
                            <p className="font-ui text-[13px] font-semibold uppercase tracking-wider text-parchment/60">Bidding unlocks at Rank {data.minRank}</p>
                          ) : (
                            <div className="grid gap-2">
                              <form action={act((fd) => placeBid(a.id, charId, Number(fd.get("amount"))), after)} className="flex gap-2">
                                <label className="sr-only" htmlFor={`bid-${a.id}`}>Your bid in gold</label>
                                <input id={`bid-${a.id}`} name="amount" type="number" min={a.min_next_bid} defaultValue={a.min_next_bid} className="input min-h-[36px] w-24 py-1" required />
                                <SubmitButton className="btn-gold btn-sm flex-1" pendingText="…">Bid</SubmitButton>
                              </form>
                              {a.buy_now_price && (
                                <form action={act(() => placeBid(a.id, charId, a.buy_now_price!), after)}>
                                  <SubmitButton className="btn-arcane btn-sm w-full" confirm={`Buy ${a.item_name} now for ${a.buy_now_price} gold?`}>Buy now · {a.buy_now_price} G</SubmitButton>
                                </form>
                              )}
                            </div>
                          )}
                          {staff && !a.is_mine && (
                            <form action={act(() => cancelAuction(a.id, "Removed by a Guild Master"), after)} className="mt-2">
                              <SubmitButton className="btn-danger btn-sm w-full" confirm="Remove this listing? Any bid is refunded and the item returns to the seller. This is logged.">GM: remove listing</SubmitButton>
                            </form>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside className="grid h-fit gap-4">
            {!viewer ? (
              <SystemWindow title="Auction Hall"><p className="text-sm text-parchment/85">Browse freely. To bid or sell, join the Guild and reach <strong className="text-gold-light">Rank {data.minRank}</strong>.</p><Link href="/join/?next=/auction/" className="btn-gold btn-sm mt-4">Start Adventure</Link></SystemWindow>
            ) : !unlocked || !charId ? (
              <SystemWindow title="Locked">
                <div className="flex items-center gap-3"><RankBadge code={data.minRank} size="lg" /><p className="text-sm text-parchment/85">The Auction Hall opens to adventurers of <strong className="text-gold-light">Rank {data.minRank}</strong> and above. Earn renown on quests to unlock bidding and selling.</p></div>
                <Link href="/quests/" className="btn-gold btn-sm mt-4">Find a quest</Link>
              </SystemWindow>
            ) : (
              <SystemWindow title="Sell an Item">
                {data.owned.length === 0 ? <p className="muted text-sm">You have no tradeable items. Quest loot and Exchange purchases can be auctioned; story items and keys are bound to you.</p> : (
                  <form action={act((fd) => createAuction(fd, charId), after)} className="grid gap-3">
                    <div><label className="label" htmlFor="item_id">Item</label>
                      <select id="item_id" name="item_id" className="input" required>{data.owned.map((o) => <option key={o.item.id} value={o.item.id}>{o.item.name} (×{o.quantity})</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label" htmlFor="quantity">Quantity</label><input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className="input" /></div>
                      <div><label className="label" htmlFor="hours">Duration</label><select id="hours" name="hours" className="input"><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></div>
                      <div><label className="label" htmlFor="start_price">Starting bid</label><input id="start_price" name="start_price" type="number" min={1} required className="input" placeholder="G" /></div>
                      <div><label className="label" htmlFor="buy_now">Buy now (optional)</label><input id="buy_now" name="buy_now" type="number" min={1} className="input" placeholder="G" /></div>
                    </div>
                    <SubmitButton pendingText="Listing…">▸ List item</SubmitButton>
                  </form>
                )}
              </SystemWindow>
            )}
            <div className="panel text-sm">
              <p className="eyebrow">House rules</p>
              <ul className="muted mt-2 grid gap-1.5">
                <li>◆ Gold only. Real money is never involved.</li>
                <li>◆ Listing fee: <span className="text-gold-light">{data.listFee} gold</span>. House cut: <span className="text-gold-light">{data.cut}%</span> of the sale.</li>
                <li>◆ Your bid is held until you win or are outbid, then returned in full.</li>
                <li>◆ A bid in the last 5 minutes extends the auction by 5 minutes.</li>
                <li>◆ Story items, keys and trophies are bound and cannot be sold.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
