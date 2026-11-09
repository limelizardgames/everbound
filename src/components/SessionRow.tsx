"use client";
import { reserveSeat } from "@/lib/actions";
import { useAct } from "@/lib/toast";
import { useViewer } from "@/lib/viewer";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusPill } from "@/components/ui";
import { dateTime, money } from "@/lib/format";
import type { SessionWithSeats } from "@/lib/queries";

export function SessionRow({ s, mine, title, onChange }: { s: SessionWithSeats; mine?: string; title?: string; onChange?: () => unknown }) {
  const act = useAct();
  const { viewer, refresh } = useViewer();
  const full = s.seats_left <= 0;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-midnight-600 bg-midnight-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {title && <p className="font-display text-gold-light">{title}</p>}
        <p className="font-semibold">{dateTime(s.starts_at)}</p>
        <p className="muted text-sm">{s.venue}{s.table_label ? ` · ${s.table_label}` : ""} · {money(s.price_cents, s.currency)}</p>
        <p className="mt-1 text-xs text-parchment/60">
          {full ? "Table full" : `${s.seats_left} of ${s.capacity} seats left`}
          {s.waitlisted > 0 ? ` · ${s.waitlisted} waitlisted` : ""}
        </p>
      </div>
      {mine ? (
        <StatusPill status={mine} />
      ) : viewer?.character ? (
        <form action={act(() => reserveSeat(s.id, viewer.character!.id), { after: async () => { await refresh(); await onChange?.(); } })}>
          <SubmitButton className={full ? "btn-ghost" : "btn-gold"} pendingText="Signing the ledger…">{full ? "Join waitlist" : "Accept quest"}</SubmitButton>
        </form>
      ) : null}
    </li>
  );
}
