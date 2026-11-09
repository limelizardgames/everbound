"use client";
import { isSupabaseConfigured } from "@/lib/env";
import { myReservations, upcomingSessions } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { useViewer } from "@/lib/viewer";
import { Empty, PageHeader } from "@/components/ui";
import { SessionRow } from "@/components/SessionRow";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";
import { dayKey, longDay } from "@/lib/format";

export default function CalendarPage() {
  useTitle("Events Calendar");
  const { viewer } = useViewer();
  const { data, reload } = useData(async () => {
    const [sessions, mine] = await Promise.all([upcomingSessions({ limit: 60 }), viewer ? myReservations(viewer.userId) : Promise.resolve(new Map<string, string>())]);
    return { sessions, mine };
  }, [viewer?.userId]);
  if (!isSupabaseConfigured) return <SetupNotice />;
  const days = new Map<string, NonNullable<typeof data>["sessions"]>();
  for (const s of data?.sessions ?? []) days.set(dayKey(s.starts_at), [...(days.get(dayKey(s.starts_at)) ?? []), s]);
  return (
    <div className="container-eb max-w-4xl py-12">
      <PageHeader eyebrow="Hosted sessions" title="Events Calendar">Every scheduled adventure at the Guild&apos;s partner store. Two tables can run at once.</PageHeader>
      {!data ? <Loading /> : data.sessions.length === 0 ? (
        <Empty title="The calendar is clear">New sessions are announced every week.</Empty>
      ) : (
        <div className="grid gap-8">
          {[...days.entries()].map(([k, list]) => (
            <section key={k}>
              <h2 className="heading text-lg">{longDay(list[0].starts_at)}</h2>
              <ul className="mt-3 grid gap-3">
                {list.map((s) => <SessionRow key={s.id} s={s} title={s.template?.title} mine={data.mine.get(s.id)} onChange={reload} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
