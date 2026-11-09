"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useViewer, isStaff } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { TavernChat, type ChatMessage } from "@/components/TavernChat";
import { PageHeader } from "@/components/ui";
import { Loading, useTitle } from "@/components/Guard";

type Channel = { id: string; slug: string; name: string; description: string | null; staff_post_only: boolean; session_id: string | null };

export default function Page() {
  return <Suspense fallback={<Loading />}><Tavern /></Suspense>;
}

function Tavern() {
  useTitle("The Guild Tavern");
  const slug = useSearchParams().get("c");
  const { viewer } = useViewer();
  const { data: channels } = useData(async () => (await must(sb().from("chat_channels").select("id, slug, name, description, staff_post_only, session_id").order("sort").order("created_at", { ascending: false }))) as Channel[], [viewer?.userId], !!viewer);
  const current = channels?.find((c) => c.slug === slug) ?? channels?.[0];
  const { data: messages } = useData(async () => ((await must(sb().from("messages").select("id, profile_id, author_name, author_role, body, created_at, deleted_at").eq("channel_id", current!.id).order("created_at", { ascending: false }).limit(60))) as ChatMessage[]).reverse(), [current?.id], !!current);
  if (!viewer || !channels) return <Loading />;
  const staff = isStaff(viewer);
  const muted = !!viewer.profile.chat_muted_until && new Date(viewer.profile.chat_muted_until) > new Date();
  return (
    <div>
      <PageHeader eyebrow="Community" title="The Guild Tavern">Chat between sessions without sharing phone numbers. Be kind — moderators are watching the hearth.</PageHeader>
      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        <nav aria-label="Channels" className="flex gap-2 overflow-x-auto lg:flex-col">
          {channels.map((c) => (
            <Link key={c.id} href={`/portal/tavern/?c=${c.slug}`} aria-current={c.id === current?.id ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${c.id === current?.id ? "bg-arcane/15 text-arcane-light" : "text-parchment/70 hover:bg-midnight-800"}`}>
              {c.session_id ? "⚑ " : "# "}{c.name}
            </Link>
          ))}
        </nav>
        {current && messages ? (
          <TavernChat key={current.id} channel={{ id: current.id, name: current.name, description: current.description, readOnly: current.staff_post_only && !staff }} initial={messages} me={viewer.userId} staff={staff} muted={muted} />
        ) : current ? <Loading /> : <p className="muted">No channels yet.</p>}
      </div>
    </div>
  );
}
