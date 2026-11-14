"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { cancelReservation, rescheduleBooking, submitAppeal } from "@/lib/actions";
import { upcomingSessions } from "@/lib/queries";
import { SubmitButton } from "@/components/SubmitButton";
import { dateTime, money } from "@/lib/format";

type Flagged = { id: string; status: string; amount_cents: number; suspension_deadline: string; session: { id: string; starts_at: string; template: { title: string } } };
type Appeal = { id: string; status: string; response: string | null; created_at: string; decided_at: string | null };

/** Shown across the portal while an account is suspended or banned. */
export function RestrictionBanner() {
  const { viewer, refresh } = useViewer();
  const act = useAct();
  const p = viewer?.profile;
  const restricted = !!p?.is_banned;
  const { data, reload } = useData(async () => {
    const [flagged, appeals, sessions] = await Promise.all([
      must(sb().from("reservations").select("id, status, amount_cents, suspension_deadline, session:quest_sessions(id, starts_at, template:quest_templates(title))").eq("profile_id", viewer!.userId).not("suspension_deadline", "is", null).neq("status", "canceled")),
      must(sb().from("restriction_appeals").select("id, status, response, created_at, decided_at").eq("profile_id", viewer!.userId).order("created_at", { ascending: false }).limit(1)),
      p?.suspended_until ? upcomingSessions({ limit: 60 }) : Promise.resolve([]),
    ]);
    return { flagged: flagged as unknown as Flagged[], appeal: (appeals as Appeal[])[0], sessions };
  }, [viewer?.userId, restricted], restricted);
  if (!p || !restricted) return null;
  const after = { after: async () => { await reload(); await refresh(); } };
  const ban = !p.suspended_until;
  const appealForThis = data?.appeal && p.restricted_at && new Date(data.appeal.created_at) >= new Date(p.restricted_at) ? data.appeal : undefined;

  return (
    <section className="mb-8 rounded-md border border-ember/60 bg-[#2a1018]/80 p-5 shadow-[0_0_30px_-10px_rgba(224,83,61,.6)] sm:p-6" role="alert">
      <p className="font-ui text-[13px] font-bold uppercase tracking-[0.3em] text-ember-light">【 System · {ban ? "Account Banned" : "Account Suspended"} 】</p>
      <h2 className="mt-2 font-display text-2xl text-parchment">{ban ? "Your account has been banned" : `Suspended until ${dateTime(p.suspended_until!)}`}</h2>
      {p.restriction_reason && <p className="mt-2 text-parchment/85"><strong className="text-ember-light">Reason:</strong> {p.restriction_reason}</p>}
      <p className="muted mt-2 text-sm">
        While {ban ? "banned" : "suspended"} you can view your adventurer but can&apos;t book quests, chat, trade or run errands.
        {ban ? "" : " Your account is restored automatically when the suspension ends."}
        {" "}See the <Link className="link" href="/conduct/#article-VII">Code of Conduct</Link>.
      </p>

      {data && data.flagged.length > 0 && (
        <div className="mt-5 rounded-sm border border-gold/40 bg-gold/5 p-4">
          <p className="font-ui text-[13px] font-bold uppercase tracking-[0.2em] text-gold-light">Action needed: bookings during your {ban ? "ban" : "suspension"}</p>
          <p className="muted mt-1 text-sm">{ban ? "Cancel" : "Reschedule to a session after your suspension, or cancel,"} before each deadline. Bookings left untouched are forfeited without refund.</p>
          <ul className="mt-3 grid gap-3">
            {data.flagged.map((f) => {
              const options = data.sessions.filter((s) => p.suspended_until && new Date(s.starts_at) > new Date(p.suspended_until) && s.price_cents <= f.amount_cents && s.id !== f.session.id);
              return (
                <li key={f.id} className="rounded-sm border border-white/10 bg-midnight-950/60 p-3">
                  <p className="font-display text-lg text-gold-light">{f.session.template.title}</p>
                  <p className="text-sm">{dateTime(f.session.starts_at)} · <span className="text-ember-light">decide by {dateTime(f.suspension_deadline)}</span></p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!ban && options.length > 0 && (
                      <form action={act((fd) => rescheduleBooking(f.id, String(fd.get("session"))), after)} className="flex flex-1 flex-wrap gap-2">
                        <label className="sr-only" htmlFor={`rs-${f.id}`}>New session</label>
                        <select id={`rs-${f.id}`} name="session" className="input min-h-[36px] flex-1 py-1 text-sm" required>
                          {options.map((s) => <option key={s.id} value={s.id}>{s.template?.title} · {dateTime(s.starts_at)} · {money(s.price_cents)}{s.seats_left <= 0 ? " (waitlist)" : ""}</option>)}
                        </select>
                        <SubmitButton className="btn-gold btn-sm">Reschedule</SubmitButton>
                      </form>
                    )}
                    {!ban && options.length === 0 && <p className="muted text-sm">No later sessions are scheduled yet. Check back, or cancel.</p>}
                    <form action={act(() => cancelReservation(f.id), after)}><SubmitButton className="btn-danger btn-sm" confirm="Cancel this booking?">Cancel booking</SubmitButton></form>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        {!appealForThis ? (
          <form action={act(submitAppeal, after)} className="grid gap-2">
            <label className="label" htmlFor="appeal">Appeal this decision</label>
            <textarea id="appeal" name="message" className="input min-h-[90px]" minLength={10} maxLength={2000} required placeholder="Explain what happened and why you think the decision should change. A different Guild Master will review it." />
            <div><SubmitButton className="btn-ghost btn-sm">Send appeal</SubmitButton></div>
          </form>
        ) : appealForThis.status === "open" ? (
          <p className="text-sm text-arcane-light">Your appeal was sent on {dateTime(appealForThis.created_at)} and is being reviewed.</p>
        ) : (
          <p className="text-sm"><strong className="text-gold-light">Appeal {appealForThis.status === "overturned" ? "granted" : "denied"}:</strong> {appealForThis.response}</p>
        )}
      </div>
    </section>
  );
}
