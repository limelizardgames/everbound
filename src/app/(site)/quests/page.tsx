"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { questBoard } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { QuestCard } from "@/components/QuestCard";
import { Empty, PageHeader } from "@/components/ui";
import { SetupNotice } from "@/components/SetupNotice";
import { Loading, useTitle } from "@/components/Guard";
import { QUEST_TYPE_LABEL } from "@/lib/format";

export default function Page() {
  return <Suspense fallback={<Loading />}><QuestBoardPage /></Suspense>;
}

function QuestBoardPage() {
  useTitle("Quest Board");
  const type = useSearchParams().get("type");
  const { data: all } = useData(questBoard, []);
  if (!isSupabaseConfigured) return <SetupNotice />;
  const quests = (all ?? []).filter((q) => !type || q.quest_type === type);
  return (
    <div className="container-eb py-12">
      <PageHeader eyebrow="Available contracts" title="Guild Quest Board">
        Postings from townsfolk, guild officials, merchants and mysterious strangers. Accept a contract to reserve your seat at the table.
      </PageHeader>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filter quests">
        <Link href="/quests/" className={`btn-sm ${!type ? "btn-gold" : "btn-ghost"}`}>All</Link>
        {Object.entries(QUEST_TYPE_LABEL).map(([k, v]) => (
          <Link key={k} href={`/quests/?type=${k}`} className={`btn-sm ${type === k ? "btn-gold" : "btn-ghost"}`}>{v}</Link>
        ))}
      </nav>
      {!all ? <Loading /> : quests.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{quests.map((q) => <QuestCard key={q.id} quest={q} />)}</div>
      ) : (
        <Empty title="No postings of this kind">Check back soon — the Guild Masters post new contracts every week.</Empty>
      )}
    </div>
  );
}
