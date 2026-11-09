import { reserveSeat } from "@/app/actions/bookings";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusPill } from "@/components/ui";
import { dateTime, money } from "@/lib/format";
import type { SessionWithSeats } from "@/lib/queries";

export function SessionRow({ s, back, mine, bookable, title }: { s: SessionWithSeats; back: string; mine?: string; bookable: boolean; title?: string }) {
  const full = s.seats_left <= 0;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-midnight-600 bg-midnight-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {title && <p className="font-display text-gold-light">{title}</p>}
        <p className="font-semibold">{dateTime(s.starts_at)}</p>
        <p className="muted text-sm">
          {s.venue}{s.table_label ? ` · ${s.table_label}` : ""} · {money(s.price_cents, s.currency)}
        </p>
        <p className="mt-1 text-xs text-parchment/60">
          {full ? "Table full" : `${s.seats_left} of ${s.capacity} seats left`}
          {s.waitlisted > 0 ? ` · ${s.waitlisted} waitlisted` : ""}
        </p>
      </div>
      {mine ? (
        <StatusPill status={mine} />
      ) : bookable ? (
        <form action={reserveSeat}>
          <input type="hidden" name="session_id" value={s.id} />
          <input type="hidden" name="back" value={back} />
          <SubmitButton className={full ? "btn-ghost" : "btn-gold"} pendingText="Signing the ledger…">
            {full ? "Join waitlist" : "Accept quest"}
          </SubmitButton>
        </form>
      ) : null}
    </li>
  );
}
