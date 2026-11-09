import { isSupabaseConfigured } from "@/lib/env";
import { getViewer } from "@/lib/auth";
import { upcomingSessions } from "@/lib/queries";
import { Empty, Flash, PageHeader, type SP } from "@/components/ui";
import { SessionRow } from "@/components/SessionRow";
import { SetupNotice } from "@/components/SetupNotice";
import { dayKey, longDay } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Events Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: SP }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const query = await searchParams;
  const [sessions, viewer] = await Promise.all([upcomingSessions({ limit: 60 }), getViewer()]);
  let mine = new Map<string, string>();
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.from("reservations").select("session_id, status").eq("profile_id", viewer.userId).neq("status", "canceled");
    mine = new Map((data ?? []).map((r) => [r.session_id, r.status]));
  }
  const days = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const k = dayKey(s.starts_at);
    days.set(k, [...(days.get(k) ?? []), s]);
  }
  return (
    <div className="container-eb max-w-4xl py-12">
      <PageHeader eyebrow="Hosted sessions" title="Events Calendar">Every scheduled adventure at the Guild&apos;s partner store. Two tables can run at once.</PageHeader>
      <Flash ok={query.ok} error={query.error} />
      {sessions.length === 0 ? (
        <Empty title="The calendar is clear">New sessions are announced every week.</Empty>
      ) : (
        <div className="grid gap-8">
          {[...days.entries()].map(([k, list]) => (
            <section key={k}>
              <h2 className="heading text-lg">{longDay(list[0].starts_at)}</h2>
              <ul className="mt-3 grid gap-3">
                {list.map((s) => (
                  <SessionRow key={s.id} s={s} title={s.template?.title} back="/calendar" mine={mine.get(s.id)} bookable={!!viewer?.character} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
