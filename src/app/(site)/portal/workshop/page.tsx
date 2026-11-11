"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { craftRecipe, forgetProfession, learnProfession } from "@/lib/actions";
import { Empty, Meter, PageHeader, StatusPill, SystemWindow } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { PROFESSION_COLOR, ProfessionIcon } from "@/components/ProfessionIcon";

type Prof = { key: string; name: string; description: string };
type Known = { profession_key: string; xp: number; level: number; next_level_xp: number | null };
type Recipe = { id: string; name: string; profession_key: string; required_level: number; output_quantity: number; prof_xp: number; gold_cost: number; output: { id: string; name: string; rarity: string; description: string | null }; ingredients: { quantity: number; item: { id: string; name: string; rarity: string } }[] };

export default function Page() {
  return <Suspense fallback={<Loading />}><Workshop /></Suspense>;
}

function Workshop() {
  useTitle("Workshop");
  const pick = useSearchParams().get("p");
  const { viewer, refresh } = useViewer();
  const act = useAct();
  const c = viewer?.character;
  const { data, reload } = useData(async () => {
    const [profs, known, recipes, inv, slots] = await Promise.all([
      must(sb().from("professions").select("key, name, description").order("sort")),
      must(sb().from("character_profession_levels").select("profession_key, xp, level, next_level_xp").eq("character_id", c!.id)),
      must(sb().from("recipes").select("id, name, profession_key, required_level, output_quantity, prof_xp, gold_cost, output:items!recipes_output_item_id_fkey(id, name, rarity, description), ingredients:recipe_ingredients(quantity, item:items(id, name, rarity))").eq("is_active", true).order("required_level")),
      must(sb().from("inventory_balances").select("item_id, quantity").eq("character_id", c!.id)),
      must(sb().from("admin_settings").select("value").eq("key", "profession_slots").maybeSingle()),
    ]);
    return { profs: profs as Prof[], known: known as Known[], recipes: recipes as unknown as Recipe[], have: new Map((inv as { item_id: string; quantity: number }[]).map((i) => [i.item_id, i.quantity])), slots: Number(slots?.value ?? 2) };
  }, [c?.id], !!c);
  if (!viewer) return null;
  if (!c) return <Empty title="Register an adventurer first" action={<Link className="btn-gold" href="/portal/character/new/">Create adventurer</Link>} />;
  if (!data) return <Loading />;
  const after = { after: async () => { await reload(); await refresh(); } };
  const knownMap = new Map(data.known.map((k) => [k.profession_key, k]));
  const active = (pick && knownMap.has(pick) ? pick : data.known[0]?.profession_key) ?? null;
  const prof = data.profs.find((p) => p.key === active);
  const k = active ? knownMap.get(active) : undefined;
  const recipes = data.recipes.filter((r) => r.profession_key === active);
  const canLearn = data.known.length < data.slots;

  return (
    <div>
      <PageHeader eyebrow="Professions · crafting" title="The Workshop" action={<Link href="/portal/errands/" className="btn-arcane btn-sm">Gather materials ▸</Link>}>
        Learn up to {data.slots} professions. Gather materials on Guild Errands, craft gear and consumables, then bring them to the table or sell them in the Auction Hall.
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {data.profs.map((p) => {
          const kn = knownMap.get(p.key);
          const color = PROFESSION_COLOR[p.key] ?? "#46BDD6";
          return (
            <div key={p.key} className={`panel flex flex-col items-center text-center ${kn && p.key === active ? "border-gold/60 shadow-gold" : ""}`}>
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10" style={{ color, background: `radial-gradient(circle, ${color}26, transparent 70%)` }}><ProfessionIcon name={p.key} className="h-10 w-10" /></span>
              <p className="mt-2 font-display text-lg text-parchment">{p.name}</p>
              <p className="muted mt-1 flex-1 text-xs">{p.description}</p>
              {kn ? (
                <div className="mt-3 w-full">
                  <p className="hud-num text-sm" style={{ color }}>Skill level {kn.level}</p>
                  <Link href={`/portal/workshop/?p=${p.key}`} className={`btn-sm mt-2 w-full ${p.key === active ? "btn-gold" : "btn-ghost"}`}>Recipes</Link>
                </div>
              ) : canLearn ? (
                <form action={act(() => learnProfession(c.id, p.key), after)} className="mt-3 w-full"><SubmitButton className="btn-arcane btn-sm w-full" confirm={`Learn ${p.name}? You can know ${data.slots} professions at once.`}>Learn</SubmitButton></form>
              ) : <p className="mt-3 font-ui text-[12px] font-semibold uppercase tracking-wider text-parchment/45">Slots full</p>}
            </div>
          );
        })}
      </div>

      {!prof || !k ? (
        <div className="mt-8"><Empty title="Choose your first profession">Pick a craft above to see its recipes.</Empty></div>
      ) : (
        <SystemWindow title={`${prof.name} · Recipes`} className="mt-8" right={<span className="hud-num text-[13px] uppercase tracking-[0.2em] text-parchment/60">Skill {k.level} / 10</span>}>
          <div className="mb-6 max-w-md"><Meter label={`${prof.name} skill`} value={k.xp} max={k.next_level_xp} tone="gold" /></div>
          <ul className="grid gap-3 lg:grid-cols-2">
            {recipes.map((r) => {
              const lockedLvl = r.required_level > k.level;
              const grey = k.level - r.required_level >= 3;
              const maxTimes = Math.min(20, ...r.ingredients.map((g) => Math.floor((data.have.get(g.item.id) ?? 0) / g.quantity)), r.gold_cost ? Math.floor((viewer.totals?.gold ?? 0) / r.gold_cost) : 20);
              return (
                <li key={r.id} className={`rounded-sm border border-white/10 bg-white/[0.03] p-4 ${lockedLvl ? "opacity-55" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-display text-lg rarity-${r.output.rarity}`}>{r.output_quantity > 1 ? `${r.output_quantity}× ` : ""}{r.output.name}</p>
                      {r.output.description && <p className="muted text-xs">{r.output.description}</p>}
                    </div>
                    {lockedLvl ? <StatusPill status="locked" label={`Skill ${r.required_level}`} /> : grey ? <StatusPill status="draft" label="Mastered" /> : <span className="hud-num text-[13px] text-gold-light">+{r.prof_xp} skill</span>}
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {r.ingredients.map((g) => {
                      const have = data.have.get(g.item.id) ?? 0;
                      return <li key={g.item.id} className={`rounded-sm border px-2 py-0.5 font-ui text-[12px] font-bold uppercase tracking-wider ${have >= g.quantity ? "border-rarity-uncommon/40 text-rarity-uncommon" : "border-ember/40 text-ember-light"}`}>{g.item.name} {have}/{g.quantity}</li>;
                    })}
                    {r.gold_cost > 0 && <li className="rounded-sm border border-gold/40 px-2 py-0.5 font-ui text-[12px] font-bold uppercase tracking-wider text-gold-light">{r.gold_cost} G fee</li>}
                  </ul>
                  {!lockedLvl && (
                    <form action={act((fd) => craftRecipe(c.id, r.id, Number(fd.get("times") || 1)), after)} className="mt-3 flex gap-2">
                      <label className="sr-only" htmlFor={`t-${r.id}`}>How many</label>
                      <input id={`t-${r.id}`} name="times" type="number" min={1} max={Math.max(1, maxTimes)} defaultValue={1} className="input min-h-[36px] w-20 py-1" disabled={maxTimes < 1} />
                      <SubmitButton className={`btn-sm flex-1 ${maxTimes < 1 ? "btn-ghost" : "btn-gold"}`} pendingText="Crafting…">{maxTimes < 1 ? "Missing materials" : "▸ Craft"}</SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          <form action={act(() => forgetProfession(c.id, k.profession_key), after)} className="mt-6 text-right">
            <SubmitButton className="btn-danger btn-sm" confirm={`Forget ${prof.name}? Your skill level in it will be lost forever.`}>Forget {prof.name}</SubmitButton>
          </form>
        </SystemWindow>
      )}
    </div>
  );
}
