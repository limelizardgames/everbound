import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, isStaff } from "@/lib/auth";
import { TavernChat, type ChatMessage } from "@/components/TavernChat";
import { PageHeader, sp, type SP } from "@/components/ui";

export const metadata = { title: "The Guild Tavern" };
export const dynamic = "force-dynamic";

export default async function Tavern({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireViewer("/portal/tavern");
  const supabase = await createClient();
  const { data: channels } = await supabase.from("chat_channels").select("id, slug, name, description, staff_post_only, session_id").order("sort").order("created_at", { ascending: false });
  const list = channels ?? [];
  const current = list.find((c) => c.slug === sp(q.c)) ?? list[0];
  const { data: messages } = current
    ? await supabase.from("messages").select("id, profile_id, author_name, author_role, body, created_at, deleted_at").eq("channel_id", current.id).order("created_at", { ascending: false }).limit(60)
    : { data: [] };
  const staff = isStaff(viewer);
  const muted = viewer.profile.chat_muted_until && new Date(viewer.profile.chat_muted_until) > new Date();
  return (
    <div>
      <PageHeader eyebrow="Community" title="The Guild Tavern">Chat between sessions without sharing phone numbers. Be kind — moderators are watching the hearth.</PageHeader>
      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        <nav aria-label="Channels" className="flex gap-2 overflow-x-auto lg:flex-col">
          {list.map((c) => (
            <Link key={c.id} href={`/portal/tavern?c=${c.slug}`} aria-current={c.id === current?.id ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${c.id === current?.id ? "bg-arcane/15 text-arcane-light" : "text-parchment/70 hover:bg-midnight-800"}`}>
              {c.session_id ? "⚑ " : "# "}{c.name}
            </Link>
          ))}
        </nav>
        {current ? (
          <TavernChat
            key={current.id}
            channel={{ id: current.id, name: current.name, description: current.description, readOnly: current.staff_post_only && !staff }}
            initial={((messages ?? []) as ChatMessage[]).reverse()}
            me={viewer.userId}
            staff={staff}
            muted={!!muted}
          />
        ) : (
          <p className="muted">No channels yet.</p>
        )}
      </div>
    </div>
  );
}
