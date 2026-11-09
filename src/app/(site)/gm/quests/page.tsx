"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useData } from "@/lib/useData";
import { QuestForm } from "@/components/QuestForm";
import { PageHeader, StatusPill } from "@/components/ui";
import { Loading, useTitle } from "@/components/Guard";
import { QUEST_TYPE_LABEL } from "@/lib/format";
import type { QuestTemplate } from "@/lib/types";

export default function Quests() {
  useTitle("Quest Creator");
  const { data } = useData(async () => {
    const [templates, locations, ranks] = await Promise.all([
      must(sb().from("quest_templates").select("*").order("updated_at", { ascending: false })),
      must(sb().from("locations").select("id, name").order("name")),
      must(sb().from("rank_definitions").select("code").order("sort")),
    ]);
    return { templates: templates as QuestTemplate[], locations: locations as { id: string; name: string }[], ranks: (ranks as { code: string }[]).map((r) => r.code) };
  }, []);
  if (!data) return <Loading />;
  return (
    <div>
      <PageHeader eyebrow="Quest definitions" title="Quest Creator">Templates are reusable stories. Schedule them as many times as you like — rewards are tracked per session, never per template.</PageHeader>
      <div className="grid gap-2">
        {data.templates.map((t) => (
          <Link key={t.id} href={`/gm/quest/?id=${t.id}`} className="panel flex flex-wrap items-center justify-between gap-2 hover:border-gold/60">
            <span><span className="font-display text-lg text-gold-light">{t.title}</span><span className="muted block text-xs">{QUEST_TYPE_LABEL[t.quest_type]} · Rank {t.rank_min}–{t.rank_max}</span></span>
            <StatusPill status={t.status} />
          </Link>
        ))}
      </div>
      <details className="mt-8">
        <summary className="btn-gold cursor-pointer list-none">+ New quest</summary>
        <div className="mt-4"><QuestForm locations={data.locations} ranks={data.ranks} /></div>
      </details>
    </div>
  );
}
