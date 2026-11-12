"use client";
import { sb, must } from "@/lib/supabase";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { saveSetting, updateOrderFulfillment } from "@/lib/actions";
import { PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Guard, Loading, useTitle } from "@/components/Guard";
import { siteUrl, TIMEZONE } from "@/lib/env";
import { money, shortDate } from "@/lib/format";

type O = { id: string; profile_id: string; status: string; fulfillment_status: string; total_cents: number; created_at: string; items: { quantity: number; product: { name: string } }[] };

export default function Page() {
  return <Guard min="admin"><SettingsPage /></Guard>;
}

function SettingsPage() {
  useTitle("Settings & Orders");
  const act = useAct();
  const { data, reload } = useData(async () => {
    const [settings, orders, people] = await Promise.all([
      must(sb().from("admin_settings").select("*").order("key")),
      must(sb().from("orders").select("id, profile_id, status, fulfillment_status, total_cents, created_at, items:order_items(quantity, product:products(name))").order("created_at", { ascending: false }).limit(50)),
      must(sb().from("profiles").select("id, display_name")),
    ]);
    return { settings: settings as { key: string; value: unknown }[], orders: orders as unknown as O[], name: new Map((people as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name])) };
  }, []);
  if (!data) return <Loading />;
  const { settings, orders, name } = data;
  const get = (k: string) => settings.find((s) => s.key === k)?.value;
  const after = { after: reload };
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Settings & Orders" />
      <section className="panel mb-6 grid gap-2 text-sm sm:grid-cols-2">
        <p>Site URL (used in QR codes): <code className="text-arcane-light">{siteUrl()}</code></p>
        <p>Venue timezone: <code className="text-arcane-light">{TIMEZONE}</code></p>
        <p className="sm:col-span-2 muted">Online payments need the two Supabase Edge Functions from <code>supabase/functions</code> deployed with your Stripe keys (see docs/SETUP.md). Switch to Stripe below only after a test payment works.</p>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <form action={act(saveSetting, after)} className="panel grid gap-2">
          <input type="hidden" name="key" value="payments_mode" />
          <label className="label" htmlFor="pm">Session payments</label>
          <select id="pm" className="input" name="value" defaultValue={String(get("payments_mode") ?? "pay_at_table")}>
            <option value="pay_at_table">Pay at the table — seats confirm instantly</option>
            <option value="stripe">Stripe Checkout required (Edge Functions deployed)</option>
          </select>
          <SubmitButton className="btn-ghost">Save</SubmitButton>
        </form>
        <form action={act(saveSetting, after)} className="panel grid gap-2">
          <input type="hidden" name="key" value="store_payments" />
          <label className="label" htmlFor="sp">Store payments</label>
          <select id="sp" className="input" name="value" defaultValue={String(get("store_payments") ?? "pay_at_pickup")}>
            <option value="pay_at_pickup">Reserve online, pay at pickup</option>
            <option value="stripe">Stripe Checkout (Edge Functions deployed)</option>
          </select>
          <SubmitButton className="btn-ghost">Save</SubmitButton>
        </form>
        <form action={act(saveSetting, after)} className="panel grid gap-2">
          <input type="hidden" name="key" value="min_age" />
          <label className="label" htmlFor="ma">Minimum age to join</label>
          <select id="ma" className="input" name="value" defaultValue={String(get("min_age") ?? 13)}>{[13, 14, 15, 16, 17, 18].map((a) => <option key={a} value={a}>{a}+</option>)}</select>
          <p className="muted text-xs">Applies to new sign-ups. Rate individual quests 15+/18+ in the Quest Creator.</p>
          <SubmitButton className="btn-ghost">Save</SubmitButton>
        </form>
        <form action={act(saveSetting, after)} className="panel grid gap-2">
          <input type="hidden" name="key" value="season_name" />
          <label className="label" htmlFor="sn">Season name</label>
          <input id="sn" className="input" name="value" defaultValue={String(get("season_name") ?? "")} />
          <SubmitButton className="btn-ghost">Save</SubmitButton>
        </form>
        <form action={act(saveSetting, after)} className="panel grid gap-2">
          <input type="hidden" name="key" value="season_start" />
          <label className="label" htmlFor="ss">Season leaderboards count from</label>
          <input id="ss" className="input" type="date" name="value" defaultValue={get("season_start") ? String(get("season_start")).slice(0, 10) : ""} />
          <SubmitButton className="btn-ghost">Start season</SubmitButton>
        </form>
        <form action={act(saveSetting, after)} className="panel grid gap-2">
          <input type="hidden" name="key" value="chat_retention_days" />
          <label className="label" htmlFor="cr">Tavern message retention (days)</label>
          <input id="cr" className="input" type="number" min={7} name="value" defaultValue={Number(get("chat_retention_days") ?? 180)} />
          <SubmitButton className="btn-ghost">Save</SubmitButton>
        </form>
        <form action={act(saveSetting, after)} className="panel grid gap-2">
          <input type="hidden" name="key" value="default_venue" />
          <label className="label" htmlFor="dv">Default venue</label>
          <input id="dv" className="input" name="value" defaultValue={String(get("default_venue") ?? "")} />
          <SubmitButton className="btn-ghost">Save</SubmitButton>
        </form>
      </div>

      <section id="orders" className="mt-10">
        <h2 className="heading text-xl">Store orders</h2>
        <div className="panel mt-3 overflow-x-auto p-0">
          <table className="table-eb">
            <thead><tr><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Fulfillment</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="text-xs">{shortDate(o.created_at)}</td><td>{name.get(o.profile_id)}</td>
                  <td className="text-xs">{o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}</td>
                  <td>{money(o.total_cents)}</td><td><StatusPill status={o.status} /></td>
                  <td>
                    <form action={act(updateOrderFulfillment, after)} className="flex gap-1">
                      <input type="hidden" name="order_id" value={o.id} />
                      <select className="input min-h-[36px] w-32 py-1 text-xs" name="fulfillment_status" defaultValue={o.fulfillment_status} aria-label="Fulfillment">{["unfulfilled", "ready", "picked_up", "shipped"].map((s) => <option key={s}>{s}</option>)}</select>
                      <SubmitButton className="btn-ghost btn-sm">Set</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
