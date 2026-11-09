"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { updateCharacter } from "@/lib/actions";
import { PageHeader, Portrait, RankBadge, Stat } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import type { RuleSetDefinition } from "@/lib/types";

export default function CharacterSheet() {
  useTitle("Character Sheet");
  const { viewer, refresh } = useViewer();
  const router = useRouter();
  const act = useAct();
  const c = viewer?.character;
  const t = viewer?.totals;
  useEffect(() => {
    if (viewer && !c) router.replace("/portal/character/new/");
  }, [viewer, c, router]);
  const { data: rs } = useData(async () => (await must(sb().from("rule_sets").select("name, version, definition").eq("id", c!.rule_set_id).single())) as { name: string; version: number; definition: RuleSetDefinition }, [c?.rule_set_id], !!c);
  if (!c || !t || !rs) return <Loading />;
  const def = rs.definition;
  const label = (list: { key: string; label: string }[] | undefined, k: string) => list?.find((x) => x.key === k)?.label ?? k;
  return (
    <div>
      <PageHeader eyebrow={`${rs.name} · v${rs.version}`} title="Character Sheet" />
      <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
        <section className="panel-arcane">
          <div className="flex items-center gap-4">
            <Portrait url={c.portrait_url} name={c.name} className="h-24 w-24" />
            <div>
              <h2 className="font-display text-2xl text-parchment">{c.name}</h2>
              <p className="muted">{label(def.species, c.species)} · {label(def.classes, c.class)} · Level {t.level}</p>
              <div className="mt-2"><RankBadge code={t.rank_code} title={t.rank_title} size="sm" /></div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{def.attributes.map((a) => <Stat key={a.key} label={a.label} value={c.attributes[a.key] ?? 0} tone="arcane" />)}</div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat label="HP" value={`${c.hp_current}/${c.hp_max}`} tone="arcane" />
            <Stat label="XP" value={t.xp} />
            <Stat label="Gold" value={t.gold} />
          </div>
          <p className="muted mt-4 text-xs">Statistics are maintained by your Guild Master to keep progression fair.</p>
        </section>
        <form key={c.id + c.name + (c.portrait_url ?? "")} action={act((fd) => updateCharacter(fd, c.id), { after: refresh })} className="panel grid gap-4">
          <h2 className="heading text-xl">Your story</h2>
          <div><label className="label" htmlFor="name">Name</label><input className="input" id="name" name="name" defaultValue={c.name} required minLength={2} maxLength={40} /></div>
          <div><label className="label" htmlFor="pronouns">Pronouns</label><input className="input" id="pronouns" name="pronouns" defaultValue={c.pronouns ?? ""} maxLength={20} /></div>
          <div><label className="label" htmlFor="backstory">Backstory</label><textarea className="input min-h-[140px]" id="backstory" name="backstory" defaultValue={c.backstory ?? ""} maxLength={4000} /></div>
          <div>
            <label className="label" htmlFor="portrait">Portrait (PNG/JPEG/WebP, under 2 MB)</label>
            <input className="input py-2 file:mr-3 file:rounded file:border-0 file:bg-gold file:px-3 file:py-1 file:text-midnight" id="portrait" name="portrait" type="file" accept="image/png,image/jpeg,image/webp" />
          </div>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="is_public" defaultChecked={c.is_public} className="h-5 w-5 accent-gold" />Public profile (shown when someone scans my card)</label>
          <SubmitButton>Save</SubmitButton>
        </form>
      </div>
    </div>
  );
}
