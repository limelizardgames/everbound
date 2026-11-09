import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { Empty, PageHeader } from "@/components/ui";
import { longDay } from "@/lib/format";

export const metadata = { title: "Adventure Journal" };

export default async function Journal() {
  const viewer = await requireViewer("/portal/journal");
  if (!viewer.character) redirect("/portal/character/new");
  const supabase = await createClient();
  const [{ data: history }, { data: archive }] = await Promise.all([
    supabase.from("character_history").select("*").eq("character_id", viewer.character.id).order("created_at", { ascending: false }),
    supabase.from("reservations").select("id, status, session:quest_sessions(id, starts_at, outcome_summary, status, template:quest_templates(title, slug))")
      .eq("profile_id", viewer.userId).eq("status", "attended").order("created_at", { ascending: false }),
  ]);
  type A = { id: string; session: { id: string; starts_at: string; outcome_summary: string | null; template: { title: string } } };
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <PageHeader eyebrow="Personal record" title="Adventure Journal" />
        {(history ?? []).length === 0 ? <Empty title="An empty page" /> : (
          <ol className="relative border-l border-gold/30 pl-6">
            {(history ?? []).map((h) => (
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
        {(archive ?? []).length === 0 ? <Empty title="No completed quests yet" /> : (
          <div className="grid gap-3">
            {((archive ?? []) as unknown as A[]).map((a) => (
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
