import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { Empty, PageHeader, StatusPill } from "@/components/ui";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Inventory" };

export default async function Inventory() {
  const viewer = await requireViewer("/portal/inventory");
  if (!viewer.character) redirect("/portal/character/new");
  const supabase = await createClient();
  const cid = viewer.character.id;
  const [{ data: inv }, { data: ledger }] = await Promise.all([
    supabase.from("inventory_balances").select("quantity, item:items(id, name, description, rarity, item_type)").eq("character_id", cid),
    supabase.from("ledger_entries").select("id, resource, amount, reason, created_at").eq("character_id", cid).order("created_at", { ascending: false }).limit(40),
  ]);
  type Row = { quantity: number; item: { id: string; name: string; description: string; rarity: string; item_type: string } };
  return (
    <div>
      <PageHeader eyebrow={`${viewer.character.name}'s satchel`} title="Inventory">
        Purse: <span className="font-display text-gold-light">{viewer.totals?.gold ?? 0} gold</span>. Every change is recorded in an immutable ledger below.
      </PageHeader>
      {(inv ?? []).length === 0 ? (
        <Empty title="Your satchel is empty">Loot from quests and trades at the Arcane Exchange will appear here.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {((inv ?? []) as unknown as Row[]).map((r) => (
            <div key={r.item.id} className="panel">
              <div className="flex items-center justify-between"><span className="eyebrow">{r.item.item_type}</span><StatusPill status={r.item.rarity === "common" ? "draft" : "unassigned"} label={r.item.rarity} /></div>
              <p className="mt-2 font-display text-lg text-gold-light">{r.item.name} <span className="text-parchment/60">×{r.quantity}</span></p>
              <p className="muted text-sm">{r.item.description}</p>
            </div>
          ))}
        </div>
      )}
      <h2 className="heading mt-10 text-xl">Ledger</h2>
      <div className="panel mt-3 overflow-x-auto p-0">
        <table className="table-eb">
          <thead><tr><th>Date</th><th>Resource</th><th>Reason</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {(ledger ?? []).map((l) => (
              <tr key={l.id}><td className="whitespace-nowrap">{shortDate(l.created_at)}</td><td className="uppercase">{l.resource}</td><td>{l.reason}</td>
                <td className={`text-right font-semibold ${l.amount < 0 ? "text-ember" : "text-forest-light"}`}>{l.amount > 0 ? "+" : ""}{l.amount}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
