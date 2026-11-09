"use client";
import Link from "next/link";
import { useViewer } from "@/lib/viewer";
import { useAct } from "@/lib/toast";
import { signOut, updateSettings } from "@/lib/actions";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { useTitle } from "@/components/Guard";

export default function Settings() {
  useTitle("Settings");
  const { viewer, refresh } = useViewer();
  const act = useAct();
  if (!viewer) return null;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow={viewer.email ?? ""} title="Account settings" />
      <form action={act(updateSettings, { after: refresh })} className="panel grid gap-4">
        <div><label className="label" htmlFor="display_name">Display name (shown in the Tavern)</label><input className="input" id="display_name" name="display_name" defaultValue={viewer.profile.display_name} required minLength={2} maxLength={40} /></div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="show_on_leaderboards" defaultChecked={viewer.profile.show_on_leaderboards} className="h-5 w-5 accent-gold" />Include my adventurer in public leaderboards (character name only)</label>
        <SubmitButton>Save settings</SubmitButton>
      </form>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/portal/orders/" className="btn-ghost">Order history</Link>
        <form action={act(signOut)}><SubmitButton className="btn-danger">Sign out</SubmitButton></form>
      </div>
    </div>
  );
}
