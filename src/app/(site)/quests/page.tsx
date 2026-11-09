import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { questBoard } from "@/lib/queries";
import { QuestCard } from "@/components/QuestCard";
import { Empty, Flash, PageHeader, sp, type SP } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { QUEST_TYPE_LABEL } from "@/lib/format";

export const metadata = { title: "Quest Board" };
export const dynamic = "force-dynamic";

export default async function QuestBoardPage({ searchParams }: { searchParams: SP }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const params = await searchParams;
  const type = sp(params.type);
  const all = await questBoard();
  const quests = type ? all.filter((q) => q.quest_type === type) : all;
  return (
    <div className="container-eb py-12">
      <PageHeader eyebrow="Available contracts" title="Guild Quest Board">
        Postings from townsfolk, guild officials, merchants and mysterious strangers. Accept a contract to reserve your seat at the table.
      </PageHeader>
      <Flash ok={params.ok} error={params.error} />
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filter quests">
        <Link href="/quests" className={`btn-sm ${!type ? "btn-gold" : "btn-ghost"}`}>All</Link>
        {Object.entries(QUEST_TYPE_LABEL).map(([k, v]) => (
          <Link key={k} href={`/quests?type=${k}`} className={`btn-sm ${type === k ? "btn-gold" : "btn-ghost"}`}>{v}</Link>
        ))}
      </nav>
      {quests.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((q) => <QuestCard key={q.id} quest={q} />)}
        </div>
      ) : (
        <Empty title="No postings of this kind">Check back soon — the Guild Masters post new contracts every week.</Empty>
      )}
    </div>
  );
}
