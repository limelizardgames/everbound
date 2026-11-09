"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { adjustLedger, grantItem, resolveReport, restrictUser, setRole } from "@/lib/actions";
import { PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { relative, shortDate } from "@/lib/format";
import { ROLE_LABEL, ROLE_ORDER, roleAtLeast } from "@/lib/types";

type Rep = { id: string; reason: string; created_at: string; message: { id: string; body: string; author_name: string; deleted_at: string | null } };
type Prof = { id: string; display_name: string; role: string; is_banned: boolean; chat_muted_until: string | null; created_at: string };
type Ch = { id: string; profile_id: string; name: string; class: string };
type Tot = { character_id: string; level: number; rank_code: string; gold: number; renown: number; xp: number };

export default function Page() {
  return <Suspense fallback={<Loading />}><Players /></Suspense>;
}

function Players() {
  useTitle("Players & Moderation");
  const search = useSearchParams().get("q")?.trim() || "";
  const router = useRouter();
  const { viewer } = useViewer();
  const act = useAct();
  const { data, reload } = useData(async () => {
    let pq = sb().from("profiles").select("id, display_name, role, is_banned, chat_muted_until, created_at").order("created_at", { ascending: false }).limit(200);
    if (search) pq = pq.ilike("display_name", `%${search}%`);
    const [profiles, chars, reports, items] = await Promise.all([
      must(pq),
      must(sb().from("characters").select("id, profile_id, name, class, is_active").eq("is_active", true)),
      must(sb().from("message_reports").select("id, reason, created_at, message:messages(id, body, author_name, deleted_at)").eq("status", "open").order("created_at")),
      must(sb().from("items").select("id, name").order("name")),
    ]);
    const cs = chars as Ch[];
    const totals = cs.length ? await must(sb().from("character_totals").select("character_id, level, rank_code, gold, renown, xp").in("character_id", cs.map((c) => c.id))) : [];
    return { profiles: profiles as Prof[], chars: cs, reports: reports as unknown as Rep[], items: items as { id: string; name: string }[], totals: totals as Tot[] };
  }, [search]);
  if (!data || !viewer) return <Loading />;
  const { profiles, chars, reports, items, totals } = data;
  const admin = roleAtLeast(viewer.profile.role, "admin");
  const owner = viewer.profile.role === "owner";
  const after = { after: reload };
  const charByProfile = new Map(chars.map((c) => [c.profile_id, c]));
  const tmap = new Map(totals.map((t) => [t.character_id, t]));

  return (
    <div>
      <PageHeader eyebrow="Character management" title="Players & Moderation" />

      <section id="reports" className="panel-arcane mb-8">
        <h2 className="heading text-lg">Open Tavern reports ({reports.length})</h2>
        <ul className="mt-3 grid gap-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-lg border border-midnight-600 p-3 text-sm">
              <p><strong>{r.message.author_name}:</strong> “{r.message.body}”</p>
              <p className="muted text-xs">Reason: {r.reason} · {relative(r.created_at)}</p>
              <div className="mt-2 flex gap-2">
                <form action={act(() => resolveReport(r.id, r.message.id, true), after)}><SubmitButton className="btn-danger btn-sm">Remove message</SubmitButton></form>
                <form action={act(() => resolveReport(r.id, r.message.id, false), after)}><SubmitButton className="btn-ghost btn-sm">Dismiss</SubmitButton></form>
              </div>
            </li>
          ))}
          {reports.length === 0 && <li className="muted text-sm">The hearth is quiet.</li>}
        </ul>
      </section>

      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("q") ?? ""); router.push(v ? `/gm/players/?q=${encodeURIComponent(v)}` : "/gm/players/"); }}>
        <input className="input max-w-xs" name="q" defaultValue={search ?? ""} placeholder="Search display name" aria-label="Search" />
        <button className="btn-ghost" type="submit">Search</button>
      </form>
      <div className="grid gap-3">
        {profiles.map((p) => {
          const c = charByProfile.get(p.id);
          const t = c ? tmap.get(c.id) : null;
          const muted = p.chat_muted_until && new Date(p.chat_muted_until) > new Date();
          return (
            <details key={p.id} className="panel">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-semibold">{p.display_name}</span>
                  <span className="muted text-xs"> · joined {shortDate(p.created_at)}</span>
                  {c && <span className="block text-sm text-gold-light">{c.name} · {c.class} · L{t?.level} · Rank {t?.rank_code} · {t?.renown} renown · {t?.gold} gold</span>}
                </span>
                <span className="flex gap-2">
                  {p.role !== "adventurer" && <StatusPill status="unassigned" label={ROLE_LABEL[p.role as keyof typeof ROLE_LABEL]} />}
                  {muted && <StatusPill status="waitlisted" label="muted" />}
                  {p.is_banned && <StatusPill status="rejected" label="banned" />}
                </span>
              </summary>
              {admin && p.id !== viewer.userId && (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <form action={act(setRole, after)} className="flex gap-2">
                      <input type="hidden" name="profile_id" value={p.id} />
                      <select className="input" name="role" defaultValue={p.role} aria-label="Role">{ROLE_ORDER.filter((r) => owner || r !== "owner").map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                      <SubmitButton className="btn-ghost">Set role</SubmitButton>
                    </form>
                    <form action={act((fd) => restrictUser(p.id, Number(fd.get("mute_minutes")), null), after)} className="flex flex-wrap gap-2">
                      <select className="input w-40" name="mute_minutes" aria-label="Mute">{[[60, "Mute 1 hour"], [1440, "Mute 1 day"], [10080, "Mute 1 week"], [0, "Unmute"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                      <SubmitButton className="btn-ghost">Apply</SubmitButton>
                    </form>
                    <form action={act(() => restrictUser(p.id, -1, !p.is_banned), after)}>
                      <SubmitButton className={p.is_banned ? "btn-ghost" : "btn-danger"} confirm={p.is_banned ? "Lift ban?" : `Ban ${p.display_name}? They will lose access to booking and chat.`}>{p.is_banned ? "Lift ban" : "Ban account"}</SubmitButton>
                    </form>
                  </div>
                  {c && (
                    <div className="grid gap-2">
                      <form action={act(adjustLedger, after)} className="flex flex-wrap gap-2">
                        <input type="hidden" name="character_id" value={c.id} />
                        <select className="input w-28" name="resource" aria-label="Resource"><option>gold</option><option>renown</option><option>xp</option></select>
                        <input className="input w-24" type="number" name="amount" placeholder="±" required aria-label="Amount" />
                        <input className="input flex-1" name="reason" placeholder="Reason (required)" required aria-label="Reason" />
                        <SubmitButton className="btn-ghost">Correct</SubmitButton>
                      </form>
                      <form action={act(grantItem, after)} className="flex flex-wrap gap-2">
                        <input type="hidden" name="character_id" value={c.id} />
                        <select className="input flex-1" name="item_id" aria-label="Item">{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                        <input className="input w-20" type="number" name="quantity" defaultValue={1} aria-label="Quantity (negative removes)" />
                        <input className="input flex-1" name="reason" placeholder="Reason" aria-label="Reason" />
                        <SubmitButton className="btn-ghost">Grant</SubmitButton>
                      </form>
                      <p className="muted text-xs">Corrections are new ledger entries, never edits. You cannot adjust your own character.</p>
                    </div>
                  )}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}
