import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { Empty, Flash, PageHeader, StatusPill, type SP } from "@/components/ui";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function Orders({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireViewer("/portal/orders");
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("id, status, fulfillment_status, total_cents, created_at, items:order_items(quantity, product:products(name))").eq("profile_id", viewer.userId).order("created_at", { ascending: false });
  type O = { id: string; status: string; fulfillment_status: string; total_cents: number; created_at: string; items: { quantity: number; product: { name: string } }[] };
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Guild Supply Shop" title="Order history" />
      <Flash ok={q.ok} error={q.error} />
      {(data ?? []).length === 0 ? <Empty title="No orders yet" /> : (
        <ul className="grid gap-3">
          {((data ?? []) as unknown as O[]).map((o) => (
            <li key={o.id} className="panel">
              <div className="flex justify-between"><span className="muted text-sm">{shortDate(o.created_at)} · #{o.id.slice(0, 8)}</span><span className="flex gap-2"><StatusPill status={o.status} /><StatusPill status={o.fulfillment_status === "unfulfilled" ? "draft" : "completed"} label={o.fulfillment_status.replace("_", " ")} /></span></div>
              <p className="mt-2 text-sm">{o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}</p>
              <p className="mt-1 font-display text-lg text-gold-light">{money(o.total_cents)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
