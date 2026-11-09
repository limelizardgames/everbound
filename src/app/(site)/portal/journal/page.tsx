"use client";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { Empty, PageHeader } from "@/components/ui";
import { Loading, useTitle } from "@/components/Guard";
import { longDay } from "@/lib/format";

type H = { id: string; title: string; body: string | null; entry_type: string; created_at: string };
type A = { id: string; session: { id: string; starts_at: string; outcome_summary: string | null; template: { title: string } } };

export default function Journal() {
  useTitle("Adventure Journal");
  const { viewer } = useViewer();
  const cid = viewer?.character?.id;
  const { data } = useData(async () => {
    const [history, archive] = await Promise.all([
      must(sb().from("character_history").select("*").eq("character_id", cid!).order("created_at", { ascending: false })),
      must(sb().from("reservations").select("id, session:quest_sessions(id, starts_at, outcome_summary, template:quest_templates(title))").eq("profile_id", viewer!.userId).eq("status", "attended").order("created_at", { ascending: false })),
    ]);
    return { history: history as H[], archive: archive as unknown as A[] };
  }, [cid], !!cid);
  if (!viewer?.character) return <Empty title="Register an adventurer first" />;
  if (!data) return <Loading />;
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <PageHeader eyebrow="Personal record" title="Adventure Journal" />
        {data.history.length === 0 ? <Empty title="An empty page" /> : (
          <ol className="relative border-l border-gold/30 pl-6">
            {data.history.map((h) => (
              <li key={h.id} className="mb-6">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-midnight-950 bg-gold" />
                <p className="text-xs uppercase tracking-wider text-parchment/50">{longDay(h.created_at)} · {h.entry_type}</p>
                <p className="font-display text-lg text-gold-light">{h.title}</p>
                {h.body && <p className="muted text-sm">{h.body}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
      <section>
        <PageHeader eyebrow="Spoiler-safe" title="Quest Archive" />
        {data.archive.length === 0 ? <Empty title="No completed quests yet" /> : (
          <div className="grid gap-3">
            {data.archive.map((a) => (
              <article key={a.id} className="parchment-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-forest">{longDay(a.session.starts_at)}</p>
                <h3 className="font-display text-xl font-bold">{a.session.template.title}</h3>
                <p className="mt-2 text-sm text-midnight/80">{a.session.outcome_summary ?? "The Guild Master has not yet written the recap."}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
