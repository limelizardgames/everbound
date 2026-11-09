"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { cancelReservation, payReservation } from "@/lib/actions";
import { Empty, PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { dateTime, money } from "@/lib/format";

type R = { id: string; status: string; payment_status: string; amount_cents: number; session: { id: string; starts_at: string; venue: string; table_label: string | null; template: { title: string; slug: string } } };

export default function Bookings() {
  useTitle("My Bookings");
  const { viewer } = useViewer();
  const act = useAct();
  const { data, reload } = useData(async () => (await must(sb().from("reservations")
    .select("id, status, payment_status, amount_cents, session:quest_sessions(id, starts_at, venue, table_label, template:quest_templates(title, slug))")
    .eq("profile_id", viewer!.userId).order("created_at", { ascending: false }).limit(50))) as unknown as R[], [viewer?.userId], !!viewer);
  if (!data) return <Loading />;
  const now = Date.now();
  const upcoming = data.filter((r) => new Date(r.session.starts_at).getTime() > now && r.status !== "canceled").sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));
  const past = data.filter((r) => !upcoming.includes(r));
  return (
    <div>
      <PageHeader eyebrow="Accepted quests" title="My Bookings" action={<Link href="/calendar/" className="btn-ghost">Find a session</Link>} />
      {upcoming.length === 0 ? <Empty title="No upcoming sessions" action={<Link className="btn-gold" href="/quests/">Visit the Quest Board</Link>} /> : (
        <ul className="grid gap-3">
          {upcoming.map((r) => (
            <li key={r.id} className="panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/quest/?s=${r.session.template.slug}`} className="font-display text-lg text-gold-light">{r.session.template.title}</Link>
                <p className="text-sm">{dateTime(r.session.starts_at)} · {r.session.venue}{r.session.table_label ? ` · ${r.session.table_label}` : ""}</p>
                <p className="muted text-xs">{money(r.amount_cents)} · {r.payment_status === "pay_at_table" ? "Pay at the store" : r.payment_status.replace("_", " ")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={r.status} />
                {r.status === "pending_payment" && <form action={act(() => payReservation(r.id))}><SubmitButton className="btn-gold btn-sm">Pay now</SubmitButton></form>}
                <form action={act(() => cancelReservation(r.id), { after: reload })}>
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
