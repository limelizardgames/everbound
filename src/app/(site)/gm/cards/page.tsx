import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { assignCard, deactivateCard, generateCards, replaceCard } from "@/app/actions/cards";
import { Flash, PageHeader, StatusPill, sp, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { shortDate } from "@/lib/format";
import { roleAtLeast } from "@/lib/types";

export const metadata = { title: "Guild Cards" };

const TIERS = ["standard", "founding", "iron", "bronze", "silver", "gold", "mythril"];

export default async function Cards({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireRole("game_master");
  const admin = roleAtLeast(viewer.profile.role, "admin");
  const batch = sp(q.batch);
  const status = sp(q.status);
  const search = sp(q.q)?.trim().toUpperCase();
  const supabase = await createClient();
  let query = supabase.from("guild_cards").select("id, card_number, status, tier, batch_label, personalized_name, claimed_at, created_at, profile_id, character:characters(name)").order("card_number", { ascending: false }).limit(200);
  if (batch) query = query.eq("batch_label", batch);
  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("card_number", `%${search}%`);
  const [{ data: cards }, { data: batches }, { data: players }] = await Promise.all([
    query,
    supabase.from("guild_cards").select("batch_label").not("batch_label", "is", null),
    supabase.from("profiles").select("id, display_name").order("display_name").limit(500),
  ]);
  const pname = new Map((players ?? []).map((p) => [p.id, p.display_name]));
  const batchList = [...new Set((batches ?? []).map((b) => b.batch_label as string))];
  type C = { id: string; card_number: string; status: string; tier: string; batch_label: string | null; personalized_name: string | null; claimed_at: string | null; profile_id: string | null; character: { name: string } | null };
  const printHref = `/print/cards?${new URLSearchParams({ ...(batch ? { batch } : {}), ...(status ? { status } : { status: "unassigned" }) })}`;

  return (
    <div>
      <PageHeader eyebrow="Physical membership" title="Guild Cards" action={<Link href={printHref} className="btn-gold" target="_blank">Print sheet ↗</Link>}>
        Forge cards, print them, and hand them out. Each QR code points to a single-use claim page; once a player claims it, the same QR shows their verified profile.
      </PageHeader>
      <Flash ok={q.ok} error={q.error} />

      {admin && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <form action={generateCards} className="panel grid gap-3">
            <h2 className="heading text-lg">Forge new cards</h2>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="label" htmlFor="count">How many</label><input className="input" type="number" id="count" name="count" min={1} max={200} defaultValue={10} /></div>
              <div><label className="label" htmlFor="tier">Design</label><select className="input" id="tier" name="tier">{TIERS.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div><label className="label" htmlFor="batch">Batch</label><input className="input" id="batch" name="batch" placeholder="e.g. nov-launch" /></div>
            </div>
            <div><label className="label" htmlFor="names">Personalized names (optional, one per line — overrides “how many”)</label><textarea className="input min-h-[70px]" id="names" name="names" /></div>
            <SubmitButton>Forge cards</SubmitButton>
          </form>
          <form action={assignCard} className="panel grid gap-3">
            <h2 className="heading text-lg">Assign or transfer a card</h2>
            <p className="muted text-xs">Staff-supervised: binds a card to a player directly (e.g. their phone can&apos;t scan, or a transfer).</p>
            <div><label className="label" htmlFor="card_number">Card number</label><input className="input font-mono uppercase" id="card_number" name="card_number" placeholder="EVB-00012" required /></div>
            <div><label className="label" htmlFor="profile_id">Player account</label>
              <select className="input" id="profile_id" name="profile_id" required>{(players ?? []).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select></div>
            <SubmitButton className="btn-ghost">Assign</SubmitButton>
          </form>
        </div>
      )}

      <form className="mb-4 flex flex-wrap gap-2" action="/gm/cards">
        <input className="input w-40 font-mono uppercase" name="q" placeholder="EVB-…" defaultValue={search ?? ""} aria-label="Search card number" />
        <select className="input w-40" name="status" defaultValue={status ?? ""} aria-label="Status"><option value="">All statuses</option><option>unassigned</option><option>claimed</option><option>deactivated</option></select>
        <select className="input w-48" name="batch" defaultValue={batch ?? ""} aria-label="Batch"><option value="">All batches</option>{batchList.map((b) => <option key={b}>{b}</option>)}</select>
        <button className="btn-ghost" type="submit">Filter</button>
      </form>

      <div className="panel overflow-x-auto p-0">
        <table className="table-eb">
          <thead><tr><th>Card</th><th>Status</th><th>Design</th><th>Holder</th><th>Batch</th><th>{admin ? "Actions" : ""}</th></tr></thead>
          <tbody>
            {((cards ?? []) as unknown as C[]).map((c) => (
              <tr key={c.id}>
                <td className="font-mono">{c.status === "claimed" ? <Link className="link" href={`/adventurers/${c.card_number}`}>{c.card_number}</Link> : c.card_number}{c.personalized_name && <span className="muted block text-xs">for {c.personalized_name}</span>}</td>
                <td><StatusPill status={c.status} /></td>
                <td className="capitalize">{c.tier}</td>
                <td>{c.profile_id ? <>{pname.get(c.profile_id) ?? "—"}{c.character && <span className="muted block text-xs">{c.character.name}</span>}{c.claimed_at && <span className="muted block text-xs">since {shortDate(c.claimed_at)}</span>}</> : "—"}</td>
                <td className="text-xs">{c.batch_label}</td>
                <td>
                  {admin && c.status === "claimed" && (
                    <form action={replaceCard} className="flex flex-wrap gap-1">
                      <input type="hidden" name="card_id" value={c.id} />
                      <select name="tier" className="input min-h-[36px] w-28 py-1 text-xs" aria-label="New design" defaultValue=""><option value="">same design</option>{TIERS.map((t) => <option key={t}>{t}</option>)}</select>
                      <input name="reason" className="input min-h-[36px] w-28 py-1 text-xs" placeholder="reason" aria-label="Reason" />
                      <SubmitButton className="btn-ghost btn-sm" confirm={`Retire ${c.card_number} and issue a replacement?`}>Replace</SubmitButton>
                    </form>
                  )}
                  {admin && c.status === "unassigned" && (
                    <form action={deactivateCard}><input type="hidden" name="card_id" value={c.id} /><input type="hidden" name="reason" value="Voided by staff" /><SubmitButton className="btn-danger btn-sm" confirm={`Void ${c.card_number}?`}>Void</SubmitButton></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
