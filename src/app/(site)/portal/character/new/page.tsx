"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { createCharacter } from "@/lib/actions";
import { AttributeAllocator } from "@/components/AttributeAllocator";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import type { RuleSetDefinition } from "@/lib/types";

export default function NewCharacter() {
  useTitle("Register Your Adventurer");
  const { viewer, refresh } = useViewer();
  const router = useRouter();
  const act = useAct();
  const { data: rs, loading } = useData(async () => (await must(sb().from("rule_sets").select("name, version, definition").eq("is_active", true).maybeSingle())) as { name: string; version: number; definition: RuleSetDefinition } | null, []);
  useEffect(() => {
    if (viewer?.character) router.replace("/portal/character/");
  }, [viewer?.character, router]);
  if (loading) return <Loading />;
  if (!rs) return <p className="muted">No rule set is active yet. Ask a Guild Master.</p>;
  const def = rs.definition;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={`${rs.name} · v${rs.version}`} title="Register your adventurer">
        Choose who you will be. You can change your story any time; your Guild Master handles the numbers at the table.
      </PageHeader>
      <form action={act((fd) => createCharacter(fd, def.attributes.map((a) => a.key)), { after: refresh })} className="panel grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="name">Adventurer name</label><input className="input" id="name" name="name" required minLength={2} maxLength={40} placeholder="Aelindra" /></div>
          <div><label className="label" htmlFor="pronouns">Pronouns (optional)</label><input className="input" id="pronouns" name="pronouns" maxLength={20} /></div>
        </div>
        <fieldset>
          <legend className="label">Species</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {def.species.map((s, i) => (
              <label key={s.key} className="flex cursor-pointer gap-3 rounded-lg border border-midnight-600 p-3 has-[:checked]:border-gold has-[:checked]:bg-gold/10">
                <input type="radio" name="species" value={s.key} required defaultChecked={i === 0} className="mt-1 accent-gold" />
                <span><span className="block font-semibold">{s.label}</span><span className="muted text-xs">{s.traits}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Class</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {def.classes.map((c, i) => (
              <label key={c.key} className="flex cursor-pointer gap-3 rounded-lg border border-midnight-600 p-3 has-[:checked]:border-gold has-[:checked]:bg-gold/10">
                <input type="radio" name="class" value={c.key} required defaultChecked={i === 0} className="mt-1 accent-gold" />
                <span><span className="block font-semibold">{c.label}</span><span className="muted text-xs">{c.role} · {c.hp_base} base HP</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <AttributeAllocator attributes={def.attributes} min={def.attribute_min} max={def.attribute_max} points={def.starting_attribute_points} />
        <div><label className="label" htmlFor="backstory">Backstory (optional)</label><textarea className="input min-h-[120px]" id="backstory" name="backstory" maxLength={4000} placeholder="Where do you come from? Why did you join the Guild?" /></div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="is_public" defaultChecked className="h-5 w-5 accent-gold" />Show my adventurer on my public guild card page and leaderboards</label>
        <SubmitButton pendingText="Inscribing…">Register with the Guild</SubmitButton>
      </form>
    </div>
  );
}
