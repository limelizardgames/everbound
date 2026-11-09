import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { markAllRead } from "@/app/actions/characters";
import { Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { relative } from "@/lib/format";

export const metadata = { title: "Notices" };
export const dynamic = "force-dynamic";

export default async function Notifications() {
  const viewer = await requireViewer("/portal/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("profile_id", viewer.userId).order("created_at", { ascending: false }).limit(100);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Guild post" title="Notices" action={viewer.unread > 0 ? <form action={markAllRead}><SubmitButton className="btn-ghost btn-sm">Mark all read</SubmitButton></form> : undefined} />
      {(data ?? []).length === 0 ? <Empty title="No notices" /> : (
        <ul className="grid gap-2">
          {(data ?? []).map((n) => (
            <li key={n.id} className={`rounded-lg border p-4 ${n.read_at ? "border-midnight-600" : "border-arcane/50 bg-arcane/5"}`}>
              <div className="flex justify-between gap-3">
                <p className="font-semibold">{n.title}</p>
                <span className="muted shrink-0 text-xs">{relative(n.created_at)}</span>
              </div>
              {n.body && <p className="muted text-sm">{n.body}</p>}
              {n.link && <Link href={n.link} className="link text-sm">Open →</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
