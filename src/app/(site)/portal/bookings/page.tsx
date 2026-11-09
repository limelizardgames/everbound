import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { cancelReservation, payReservation } from "@/app/actions/bookings";
import { Empty, Flash, PageHeader, StatusPill, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { dateTime, money } from "@/lib/format";

export const metadata = { title: "My Bookings" };
export const dynamic = "force-dynamic";

export default async function Bookings({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireViewer("/portal/bookings");
  const supabase = await createClient();
  const { data } = await supabase.from("reservations")
    .select("id, status, payment_status, amount_cents, hold_expires_at, session:quest_sessions(id, starts_at, venue, table_label, status, template:quest_templates(title, slug))")
    .eq("profile_id", viewer.userId).order("created_at", { ascending: false }).limit(50);
  type R = { id: string; status: string; payment_status: string; amount_cents: number; hold_expires_at: string | null; session: { id: string; starts_at: string; venue: string; table_label: string | null; status: string; template: { title: string; slug: string } } };
  const rows = (data ?? []) as unknown as R[];
  const now = Date.now();
  const upcoming = rows.filter((r) => new Date(r.session.starts_at).getTime() > now && r.status !== "canceled").sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));
  const past = rows.filter((r) => !upcoming.includes(r));
  return (
    <div>
      <PageHeader eyebrow="Accepted quests" title="My Bookings" action={<Link href="/calendar" className="btn-ghost">Find a session</Link>} />
      <Flash ok={q.ok} error={q.error} />
      {upcoming.length === 0 ? <Empty title="No upcoming sessions" action={<Link className="btn-gold" href="/quests">Visit the Quest Board</Link>} /> : (
        <ul className="grid gap-3">
          {upcoming.map((r) => (
            <li key={r.id} className="panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/quests/${r.session.template.slug}`} className="font-display text-lg text-gold-light">{r.session.template.title}</Link>
                <p className="text-sm">{dateTime(r.session.starts_at)} · {r.session.venue}{r.session.table_label ? ` · ${r.session.table_label}` : ""}</p>
                <p className="muted text-xs">{money(r.amount_cents)} · {r.payment_status === "pay_at_table" ? "Pay at the store" : r.payment_status.replace("_", " ")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={r.status} />
                {r.status === "pending_payment" && (
                  <form action={payReservation}><input type="hidden" name="reservation_id" value={r.id} /><SubmitButton className="btn-gold btn-sm">Pay now</SubmitButton></form>
                )}
                <form action={cancelReservation}>
                  <input type="hidden" name="reservation_id" value={r.id} />
                  <SubmitButton className="btn-danger btn-sm" confirm="Cancel this reservation? Your seat goes to the waitlist.">Cancel</SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <>
          <h2 className="heading mt-10 text-xl">History</h2>
          <ul className="mt-3 grid gap-2">
            {past.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-midnight-600 p-3 text-sm">
                <span>{r.session.template.title} · <span className="muted">{dateTime(r.session.starts_at)}</span></span>
                <StatusPill status={r.status} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
