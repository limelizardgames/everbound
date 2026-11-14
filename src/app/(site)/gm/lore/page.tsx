"use client";
import Link from "next/link";
import { sb, must } from "@/lib/supabase";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { resetOaths, saveFaction, saveOaths } from "@/lib/actions";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Guard, Loading, useTitle } from "@/components/Guard";
import { FactionSigil, FACTION_TONE, RAID_SIDE_LABEL } from "@/components/FactionSigil";
import { DEFAULT_OATHS, type Oath } from "@/components/GuildOaths";
import type { Faction } from "@/lib/types";

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const COLORS: [Faction["color"], string][] = [["gold", "Gold"], ["ember", "Ember red"], ["arcane", "Arcane blue"], ["epic", "Violet"], ["green", "Green"]];

export default function Page() {
  return <Guard min="admin"><LorePage /></Guard>;
}

function LorePage() {
  useTitle("Names & Lore");
  const act = useAct();
  const { data, reload } = useData(async () => {
    const [factions, oaths] = await Promise.all([
      must(sb().from("factions").select("id, slug, name, motto, description, color, raid_side, is_default").order("sort")),
      must(sb().from("admin_settings").select("value").eq("key", "guild_oaths").maybeSingle()),
    ]);
    const saved = (oaths as { value: Oath[] } | null)?.value;
    return { factions: factions as Faction[], oaths: Array.isArray(saved) && saved.length === 10 ? saved : DEFAULT_OATHS, custom: Array.isArray(saved) };
  }, []);
  if (!data) return <Loading />;
  const after = { after: reload };

  return (
    <div className="grid gap-10">
      <PageHeader eyebrow="Administration" title="Names & Lore">
        Rename the allegiances and reword the Ten Oaths. Changes appear across the site straight away.
      </PageHeader>

      <section>
        <h2 className="heading text-2xl">Allegiances</h2>
        <p className="muted mt-1 text-sm">Shown on the <Link className="link" href="/allegiances/">Allegiances</Link> page, each player&apos;s Allegiance page and the Raid Center. Renaming keeps every member in place. The side each allegiance takes in two-sided raids is fixed.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {data.factions.map((f) => {
            const tone = FACTION_TONE[f.color];
            return (
              <form key={f.id} action={act(saveFaction, after)} className={`panel grid content-start gap-3 ${tone.border}`}>
                <input type="hidden" name="faction_id" value={f.id} />
                <div className={`flex items-center gap-3 ${tone.text}`}>
                  <FactionSigil slug={f.slug} className="h-10 w-10" />
                  <p className="text-xs uppercase tracking-wider text-parchment/60">
                    {f.is_default ? "Everyone starts here" : "Pledged from the set rank"} · raids: {RAID_SIDE_LABEL[f.raid_side]}
                  </p>
                </div>
                <div><label className="label" htmlFor={`n-${f.id}`}>Name</label><input id={`n-${f.id}`} className="input" name="name" defaultValue={f.name} required minLength={3} maxLength={60} /></div>
                <div><label className="label" htmlFor={`m-${f.id}`}>Motto</label><input id={`m-${f.id}`} className="input" name="motto" defaultValue={f.motto} required maxLength={40} /></div>
                <div><label className="label" htmlFor={`d-${f.id}`}>Description</label><textarea id={`d-${f.id}`} className="input min-h-[96px]" name="description" defaultValue={f.description} required maxLength={300} /></div>
                <div><label className="label" htmlFor={`c-${f.id}`}>Colour</label>
                  <select id={`c-${f.id}`} className="input" name="color" defaultValue={f.color}>{COLORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <SubmitButton className="btn-gold">Save {f.name.replace(/^The /, "")}</SubmitButton>
              </form>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="heading text-2xl">The Ten Oaths</h2>
        <p className="muted mt-1 text-sm">
          Shown on the <Link className="link" href="/conduct/">Code of Conduct</Link> and the <Link className="link" href="/how-it-works/">Guild Handbook</Link>. Each oath has the in-world wording and a plain-language meaning underneath it.
          {data.custom ? " You are using your own wording." : " You are using the original wording."}
        </p>
        <form action={act(saveOaths, after)} className="panel mt-4 grid gap-4">
          {data.oaths.map((o, i) => (
            <div key={i} className="grid gap-2 border-b border-white/5 pb-4 last:border-0 sm:grid-cols-[3rem_1fr_1fr] sm:items-start">
              <span className="font-display text-2xl text-gold-light sm:pt-6">{NUMERALS[i]}</span>
              <div><label className="label" htmlFor={`o-${i}`}>Oath {NUMERALS[i]}</label><input id={`o-${i}`} className="input" name={`oath_${i}`} defaultValue={o.oath} required maxLength={120} /></div>
              <div><label className="label" htmlFor={`p-${i}`}>What it means</label><input id={`p-${i}`} className="input" name={`plain_${i}`} defaultValue={o.plain} maxLength={140} /></div>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <SubmitButton className="btn-gold">Save the Ten Oaths</SubmitButton>
          </div>
        </form>
        {data.custom && (
          <form action={act(resetOaths, after)} className="mt-3">
            <SubmitButton className="btn-ghost btn-sm" confirm="Put the Ten Oaths back to their original wording?">Restore original wording</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
