"use client";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { Empty, PageHeader } from "@/components/ui";
import { Loading, useTitle } from "@/components/Guard";
import { shortDate } from "@/lib/format";

type Ach = { id: string; name: string; description: string; renown_bonus: number };

export default function Achievements() {
  useTitle("Achievements");
  const { viewer } = useViewer();
  const cid = viewer?.character?.id;
  const { data } = useData(async () => {
    const [all, mine] = await Promise.all([
      must(sb().from("achievements").select("*").order("name")),
      must(sb().from("character_achievements").select("achievement_id, awarded_at").eq("character_id", cid!)),
    ]);
    return { all: all as Ach[], earned: new Map((mine as { achievement_id: string; awarded_at: string }[]).map((m) => [m.achievement_id, m.awarded_at])) };
  }, [cid], !!cid);
  if (!viewer?.character) return <Empty title="Register an adventurer first" />;
  if (!data) return <Loading />;
  return (
    <div>
      <PageHeader eyebrow="Titles & honors" title="Achievements">{data.earned.size} earned. Secret achievements reveal themselves when found.</PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.all.map((a) => {
          const at = data.earned.get(a.id);
          return (
            <div key={a.id} className={`rounded-xl border p-5 ${at ? "border-gold/60 bg-gold/10 shadow-gold" : "border-midnight-600 bg-midnight-900/50 opacity-70"}`}>
              <p className="font-display text-lg text-gold-light">{a.name}</p>
              <p className="muted text-sm">{a.description}</p>
              <p className="mt-2 text-xs">{at ? <span className="text-arcane-light">Earned {shortDate(at)}</span> : <span className="text-parchment/50">Not yet earned{a.renown_bonus ? ` · +${a.renown_bonus} renown` : ""}</span>}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
