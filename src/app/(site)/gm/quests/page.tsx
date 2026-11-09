import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuestForm } from "@/components/QuestForm";
import { Flash, PageHeader, StatusPill, type SP } from "@/components/ui";
import { QUEST_TYPE_LABEL } from "@/lib/format";
import type { QuestTemplate } from "@/lib/types";

export const metadata = { title: "Quest Creator" };

export default async function Quests({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const supabase = await createClient();
  const [{ data: templates }, { data: locations }, { data: ranks }] = await Promise.all([
    supabase.from("quest_templates").select("*").order("updated_at", { ascending: false }),
    supabase.from("locations").select("id, name").order("name"),
    supabase.from("rank_definitions").select("code").order("sort"),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Quest definitions" title="Quest Creator">Templates are reusable stories. Schedule them as many times as you like — rewards are tracked per session, never per template.</PageHeader>
      <Flash ok={q.ok} error={q.error} />
      <div className="grid gap-2">
        {((templates ?? []) as QuestTemplate[]).map((t) => (
          <Link key={t.id} href={`/gm/quests/${t.id}`} className="panel flex flex-wrap items-center justify-between gap-2 hover:border-gold/60">
            <span><span className="font-display text-lg text-gold-light">{t.title}</span><span className="muted block text-xs">{QUEST_TYPE_LABEL[t.quest_type]} · Rank {t.rank_min}–{t.rank_max}</span></span>
            <StatusPill status={t.status} />
          </Link>
        ))}
      </div>
      <details className="mt-8">
        <summary className="btn-gold cursor-pointer list-none">+ New quest</summary>
        <div className="mt-4"><QuestForm locations={locations ?? []} ranks={(ranks ?? []).map((r) => r.code)} /></div>
      </details>
    </div>
  );
}
