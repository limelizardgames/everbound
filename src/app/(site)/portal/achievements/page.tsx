import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Achievements" };

export default async function Achievements() {
  const viewer = await requireViewer("/portal/achievements");
  if (!viewer.character) redirect("/portal/character/new");
  const supabase = await createClient();
  const [{ data: all }, { data: mine }] = await Promise.all([
    supabase.from("achievements").select("*").order("name"),
    supabase.from("character_achievements").select("achievement_id, awarded_at").eq("character_id", viewer.character.id),
  ]);
  const earned = new Map((mine ?? []).map((m) => [m.achievement_id, m.awarded_at]));
  return (
    <div>
      <PageHeader eyebrow="Titles & honors" title="Achievements">{earned.size} earned. Secret achievements reveal themselves when found.</PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(all ?? []).map((a) => {
          const at = earned.get(a.id);
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
