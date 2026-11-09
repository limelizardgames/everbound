import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { setTemplateStatus } from "@/app/actions/gm";
import { QuestForm } from "@/components/QuestForm";
import { Flash, PageHeader, StatusPill, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { roleAtLeast, type QuestTemplate } from "@/lib/types";

export default async function EditQuest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const q = await searchParams;
  const viewer = await requireRole("game_master");
  const supabase = await createClient();
  const [{ data: quest }, { data: secrets }, { data: objectives }, { data: locations }, { data: ranks }] = await Promise.all([
    supabase.from("quest_templates").select("*").eq("id", id).maybeSingle(),
    supabase.from("quest_template_secrets").select("*").eq("template_id", id).maybeSingle(),
    supabase.from("quest_objectives").select("description, is_secret").eq("template_id", id).order("sort"),
    supabase.from("locations").select("id, name").order("name"),
    supabase.from("rank_definitions").select("code").order("sort"),
  ]);
  if (!quest) notFound();
  const t = quest as QuestTemplate;
  const senior = roleAtLeast(viewer.profile.role, "senior_gm");
  return (
    <div>
      <Link href="/gm/quests" className="link text-sm">← All quests</Link>
      <PageHeader eyebrow="Quest Creator" title={t.title} action={<StatusPill status={t.status} />}>
        {t.status === "published" && <Link className="link" href={`/quests/${t.slug}`}>View on the Quest Board →</Link>}
      </PageHeader>
      <Flash ok={q.ok} error={q.error} />
      <div className="mb-6 flex flex-wrap gap-2">
        {senior ? (
          ["published", "locked", "draft", "archived"].filter((s) => s !== t.status).map((s) => (
            <form key={s} action={setTemplateStatus}>
              <input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value={s} />
              <SubmitButton className={s === "published" ? "btn-gold btn-sm" : "btn-ghost btn-sm"}>{s === "published" ? "Approve & publish" : `Set ${s}`}</SubmitButton>
            </form>
          ))
        ) : (
          <p className="muted text-sm">A Senior GM approves and publishes quests.</p>
        )}
      </div>
      <QuestForm quest={t} secrets={secrets} objectives={objectives ?? []} locations={locations ?? []} ranks={(ranks ?? []).map((r) => r.code)} />
    </div>
  );
}
