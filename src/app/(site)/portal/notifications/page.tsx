"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { markAllRead } from "@/lib/actions";
import { Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { relative } from "@/lib/format";

type N = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export default function Notifications() {
  useTitle("Notices");
  const { viewer, refresh } = useViewer();
  const act = useAct();
  const { data, reload } = useData(async () => (await must(sb().from("notifications").select("*").eq("profile_id", viewer!.userId).order("created_at", { ascending: false }).limit(100))) as N[], [viewer?.userId], !!viewer);
  if (!data) return <Loading />;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Guild post" title="Notices" action={data.some((n) => !n.read_at) ? <form action={act(markAllRead, { after: async () => { await reload(); await refresh(); } })}><SubmitButton className="btn-ghost btn-sm">Mark all read</SubmitButton></form> : undefined} />
      {data.length === 0 ? <Empty title="No notices" /> : (
        <ul className="grid gap-2">
          {data.map((n) => (
            <li key={n.id} className={`rounded-lg border p-4 ${n.read_at ? "border-midnight-600" : "border-arcane/50 bg-arcane/5"}`}>
              <div className="flex justify-between gap-3"><p className="font-semibold">{n.title}</p><span className="muted shrink-0 text-xs">{relative(n.created_at)}</span></div>
              {n.body && <p className="muted text-sm">{n.body}</p>}
              {n.link && <Link href={n.link} className="link text-sm">Open →</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
