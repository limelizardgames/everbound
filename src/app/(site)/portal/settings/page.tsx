import { requireViewer } from "@/lib/auth";
import { updateSettings } from "@/app/actions/characters";
import { signOut } from "@/app/actions/auth";
import { Flash, PageHeader, type SP } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import Link from "next/link";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: SP }) {
  const q = await searchParams;
  const viewer = await requireViewer("/portal/settings");
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow={viewer.email ?? ""} title="Account settings" />
      <Flash ok={q.ok} error={q.error} />
      <form action={updateSettings} className="panel grid gap-4">
        <div>
          <label className="label" htmlFor="display_name">Display name (shown in the Tavern)</label>
          <input className="input" id="display_name" name="display_name" defaultValue={viewer.profile.display_name} required minLength={2} maxLength={40} />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="show_on_leaderboards" defaultChecked={viewer.profile.show_on_leaderboards} className="h-5 w-5 accent-gold" />
          Include my adventurer in public leaderboards (character name only)
        </label>
        <SubmitButton>Save settings</SubmitButton>
      </form>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/portal/orders" className="btn-ghost">Order history</Link>
        <form action={signOut}><SubmitButton className="btn-danger">Sign out</SubmitButton></form>
      </div>
    </div>
  );
}
