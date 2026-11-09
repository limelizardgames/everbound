"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { setTemplateStatus } from "@/lib/actions";
import { QuestForm } from "@/components/QuestForm";
import { Empty, PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { roleAtLeast, type QuestTemplate } from "@/lib/types";

export default function Page() {
  return <Suspense fallback={<Loading />}><EditQuest /></Suspense>;
}

function EditQuest() {
  const id = useSearchParams().get("id") ?? "";
  const { viewer } = useViewer();
  const act = useAct();
  const { data, loading, reload } = useData(async () => {
    const [quest, secrets, objectives, locations, ranks] = await Promise.all([
      must(sb().from("quest_templates").select("*").eq("id", id).maybeSingle()),
      must(sb().from("quest_template_secrets").select("*").eq("template_id", id).maybeSingle()),
      must(sb().from("quest_objectives").select("description, is_secret").eq("template_id", id).order("sort")),
      must(sb().from("locations").select("id, name").order("name")),
      must(sb().from("rank_definitions").select("code").order("sort")),
    ]);
    return { quest: quest as QuestTemplate | null, secrets, objectives: objectives as { description: string; is_secret: boolean }[], locations: locations as { id: string; name: string }[], ranks: (ranks as { code: string }[]).map((r) => r.code) };
  }, [id]);
  useTitle(data?.quest?.title ?? "Quest Creator");
  if (loading || !viewer) return <Loading />;
  if (!data?.quest) return <Empty title="Quest not found" action={<Link className="btn-ghost" href="/gm/quests/">All quests</Link>} />;
  const t = data.quest;
  const senior = roleAtLeast(viewer.profile.role, "senior_gm");
  return (
    <div>
      <Link href="/gm/quests/" className="link text-sm">← All quests</Link>
      <PageHeader eyebrow="Quest Creator" title={t.title} action={<StatusPill status={t.status} />}>
        {t.status === "published" && <Link className="link" href={`/quest/?s=${t.slug}`}>View on the Quest Board →</Link>}
      </PageHeader>
      <div className="mb-6 flex flex-wrap gap-2">
        {senior ? ["published", "locked", "draft", "archived"].filter((s) => s !== t.status).map((s) => (
          <form key={s} action={act(() => setTemplateStatus(t.id, s), { after: reload })}>
            <SubmitButton className={s === "published" ? "btn-gold btn-sm" : "btn-ghost btn-sm"}>{s === "published" ? "Approve & publish" : `Set ${s}`}</SubmitButton>
          </form>
        )) : <p className="muted text-sm">A Senior GM approves and publishes quests.</p>}
      </div>
      <QuestForm key={t.id + t.status} quest={t} secrets={data.secrets} objectives={data.objectives} locations={data.locations} ranks={data.ranks} onSaved={reload} />
    </div>
  );
}
