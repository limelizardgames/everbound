"use client";
import { sb, must } from "@/lib/supabase";
import { useViewer } from "@/lib/viewer";
import { useData } from "@/lib/useData";
import { useAct } from "@/lib/toast";
import { saveErrand, saveRecipe, toggleErrand, toggleRecipe } from "@/lib/actions";
import { PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Loading, useTitle } from "@/components/Guard";
import { roleAtLeast } from "@/lib/types";

type Opt = { id: string; name: string };
type E = { id: string; title: string; kind: string; min_rank: string; duration_minutes: number | null; gold_reward: number; is_active: boolean; rewards: { qty_min: number; qty_max: number; chance: number; item: { name: string } }[] };
type R = { id: string; name: string; profession_key: string; required_level: number; is_active: boolean; ingredients: { quantity: number; item: { name: string } }[] };

export default function GmErrands() {
  useTitle("Errands & Crafting");
  const { viewer } = useViewer();
  const act = useAct();
  const { data, reload } = useData(async () => {
    const c = sb();
    const [errands, recipes, items, locations, profs, ranks, runs] = await Promise.all([
      must(c.from("errands").select("id, title, kind, min_rank, duration_minutes, gold_reward, is_active, rewards:errand_rewards(qty_min, qty_max, chance, item:items(name))").order("kind").order("sort")),
      must(c.from("recipes").select("id, name, profession_key, required_level, is_active, ingredients:recipe_ingredients(quantity, item:items(name))").order("profession_key").order("required_level")),
      must(c.from("items").select("id, name").order("name")),
      must(c.from("locations").select("id, name").order("name")),
      must(c.from("professions").select("key, name").order("sort")),
      must(c.from("rank_definitions").select("code").order("sort")),
      must(c.from("errand_runs").select("status").gte("started_at", new Date(Date.now() - 7 * 86400000).toISOString())),
    ]);
    return { errands: errands as unknown as E[], recipes: recipes as unknown as R[], items: items as Opt[], locations: locations as Opt[], profs: profs as { key: string; name: string }[], ranks: (ranks as { code: string }[]).map((r) => r.code), week: (runs as { status: string }[]).length };
  }, []);
  if (!data || !viewer) return <Loading />;
  const senior = roleAtLeast(viewer.profile.role, "senior_gm");
  const after = { after: reload };
  const itemSelect = (name: string) => <select name={name} className="input min-h-[36px] py-1 text-sm" aria-label="Item"><option value="">—</option>{data.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>;

  return (
    <div>
      <PageHeader eyebrow="At-home play" title="Errands & Crafting">
        Post expeditions and riddles players complete between sessions, and manage profession recipes. Errands pay materials and up to 50 gold, never XP or renown. {data.week} errands were run in the last 7 days.
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="heading text-xl">Errand Board</h2>
          <ul className="mt-3 grid gap-2">
            {data.errands.map((e) => (
              <li key={e.id} className={`panel flex flex-wrap items-start justify-between gap-2 py-3 ${e.is_active ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <p className="font-display text-lg text-gold-light">{e.title}</p>
                  <p className="muted font-ui text-[12px] font-semibold uppercase tracking-wider">{e.kind}{e.duration_minutes ? ` · ${Math.round(e.duration_minutes / 6) / 10}h` : ""} · Rank {e.min_rank}+ · {e.gold_reward} G</p>
                  <p className="text-xs text-parchment/70">{e.rewards.map((r) => `${r.qty_min === r.qty_max ? r.qty_min : `${r.qty_min}-${r.qty_max}`}× ${r.item.name}${r.chance < 1 ? ` (${Math.round(r.chance * 100)}%)` : ""}`).join(", ")}</p>
                </div>
                {senior && <form action={act(() => toggleErrand(e.id, !e.is_active), after)}><SubmitButton className="btn-ghost btn-sm">{e.is_active ? "Hide" : "Publish"}</SubmitButton></form>}
              </li>
            ))}
          </ul>
          {senior && (
            <details className="panel mt-4">
              <summary className="cursor-pointer font-display text-lg text-gold-light">+ Post an errand</summary>
              <form action={act(saveErrand, after)} className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label" htmlFor="kind">Type</label><select id="kind" name="kind" className="input"><option value="expedition">Expedition (timed)</option><option value="riddle">Riddle</option></select></div>
                  <div><label className="label" htmlFor="etitle">Title</label><input id="etitle" name="title" className="input" required /></div>
                </div>
                <div><label className="label" htmlFor="edesc">Description, or the riddle question</label><textarea id="edesc" name="description" className="input min-h-[80px]" required /></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div><label className="label" htmlFor="eloc">Location</label><select id="eloc" name="location_id" className="input"><option value="">—</option>{data.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                  <div><label className="label" htmlFor="erank">Min rank</label><select id="erank" name="min_rank" className="input">{data.ranks.map((r) => <option key={r}>{r}</option>)}</select></div>
                  <div><label className="label" htmlFor="ehours">Hours (exped.)</label><input id="ehours" name="hours" type="number" min={0.25} max={72} step={0.25} defaultValue={2} className="input" /></div>
                  <div><label className="label" htmlFor="egold">Gold (max 50)</label><input id="egold" name="gold" type="number" min={0} max={50} defaultValue={3} className="input" /></div>
                </div>
                <div><label className="label" htmlFor="eans">Riddle answers (comma-separated; case and punctuation ignored)</label><input id="eans" name="answers" className="input" placeholder="Gate" /></div>
                <p className="label">Material rewards</p>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-2">
                    {itemSelect(`item_${i}`)}
                    <input name={`min_${i}`} type="number" min={1} max={20} placeholder="min" className="input min-h-[36px] py-1" aria-label="Minimum" />
                    <input name={`max_${i}`} type="number" min={1} max={20} placeholder="max" className="input min-h-[36px] py-1" aria-label="Maximum" />
                    <input name={`chance_${i}`} type="number" min={1} max={100} placeholder="% chance" className="input min-h-[36px] py-1" aria-label="Chance percent" />
                  </div>
                ))}
                <SubmitButton>Post to the board</SubmitButton>
              </form>
            </details>
          )}
        </section>

        <section>
          <h2 className="heading text-xl">Recipes</h2>
          <ul className="mt-3 grid gap-2">
            {data.recipes.map((r) => (
              <li key={r.id} className={`panel flex items-start justify-between gap-2 py-3 ${r.is_active ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <p className="font-display text-lg text-gold-light">{r.name}</p>
                  <p className="muted font-ui text-[12px] font-semibold uppercase tracking-wider">{r.profession_key} · skill {r.required_level}</p>
                  <p className="text-xs text-parchment/70">{r.ingredients.map((g) => `${g.quantity}× ${g.item.name}`).join(" + ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!r.is_active && <StatusPill status="draft" label="hidden" />}
                  {senior && <form action={act(() => toggleRecipe(r.id, !r.is_active), after)}><SubmitButton className="btn-ghost btn-sm">{r.is_active ? "Hide" : "Publish"}</SubmitButton></form>}
                </div>
              </li>
            ))}
          </ul>
          {senior && (
            <details className="panel mt-4">
              <summary className="cursor-pointer font-display text-lg text-gold-light">+ Add a recipe</summary>
              <form action={act(saveRecipe, after)} className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label" htmlFor="rname">Recipe name</label><input id="rname" name="name" className="input" required placeholder="Brew Healing Draught" /></div>
                  <div><label className="label" htmlFor="rprof">Profession</label><select id="rprof" name="profession_key" className="input">{data.profs.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div className="col-span-2"><label className="label" htmlFor="rout">Makes</label><select id="rout" name="output_item_id" className="input" required>{data.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                  <div><label className="label" htmlFor="rqty">Qty</label><input id="rqty" name="output_quantity" type="number" min={1} max={20} defaultValue={1} className="input" /></div>
                  <div><label className="label" htmlFor="rlvl">Skill req.</label><input id="rlvl" name="required_level" type="number" min={1} max={10} defaultValue={1} className="input" /></div>
                  <div><label className="label" htmlFor="rxp">Skill XP</label><input id="rxp" name="prof_xp" type="number" min={1} max={200} defaultValue={10} className="input" /></div>
                </div>
                <div className="max-w-[10rem]"><label className="label" htmlFor="rgold">Workshop fee (G)</label><input id="rgold" name="gold_cost" type="number" min={0} max={100} defaultValue={0} className="input" /></div>
                <p className="label">Ingredients</p>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-[3fr,1fr] gap-2">{itemSelect(`ing_${i}`)}<input name={`qty_${i}`} type="number" min={1} max={50} placeholder="qty" className="input min-h-[36px] py-1" aria-label="Quantity" /></div>
                ))}
                <p className="muted text-xs">Need a brand-new item? Add it in Supabase → Table Editor → items, then it appears here.</p>
                <SubmitButton>Add recipe</SubmitButton>
              </form>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
