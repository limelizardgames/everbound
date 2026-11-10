"use client";
import { saveQuestTemplate } from "@/lib/actions";
import { useAct } from "@/lib/toast";
import { SubmitButton } from "@/components/SubmitButton";
import { QUEST_TYPE_LABEL } from "@/lib/format";
import type { QuestTemplate } from "@/lib/types";

type Secrets = { gm_notes: string | null; npcs: string | null; encounter_notes: string | null; consequence_hooks: string | null } | null;

export function QuestForm({ quest, secrets, objectives, locations, ranks, onSaved }: {
  onSaved?: () => unknown;
  quest?: QuestTemplate; secrets?: Secrets; objectives?: { description: string; is_secret: boolean }[];
  locations: { id: string; name: string }[]; ranks: string[];
}) {
  const act = useAct();
  const f = (k: keyof QuestTemplate) => (quest ? String(quest[k] ?? "") : "");
  return (
    <form action={act(saveQuestTemplate, { after: onSaved })} className="grid gap-6">
      {quest && <input type="hidden" name="id" value={quest.id} />}
      <section className="panel grid gap-4">
        <h2 className="heading text-lg">Player-facing (spoiler-safe)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" required defaultValue={f("title")} /></div>
          <div><label className="label" htmlFor="slug">URL slug (optional)</label><input className="input" id="slug" name="slug" defaultValue={f("slug")} pattern="[a-z0-9-]+" /></div>
        </div>
        <div><label className="label" htmlFor="summary">One-line summary</label><input className="input" id="summary" name="summary" required defaultValue={f("summary")} /></div>
        <div><label className="label" htmlFor="description">Narrative description</label><textarea className="input min-h-[140px]" id="description" name="description" required defaultValue={f("description")} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label" htmlFor="quest_type">Format</label>
            <select className="input" id="quest_type" name="quest_type" defaultValue={f("quest_type") || "standard"}>{Object.entries(QUEST_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label" htmlFor="difficulty">Difficulty</label>
            <select className="input" id="difficulty" name="difficulty" defaultValue={f("difficulty") || "moderate"}>{["gentle", "moderate", "hard", "deadly"].map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className="label" htmlFor="location_id">Location</label>
            <select className="input" id="location_id" name="location_id" defaultValue={f("location_id")}><option value="">—</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          <div><label className="label" htmlFor="rank_min">Min rank</label>
            <select className="input" id="rank_min" name="rank_min" defaultValue={f("rank_min") || "F"}>{ranks.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label className="label" htmlFor="rank_max">Max rank</label>
            <select className="input" id="rank_max" name="rank_max" defaultValue={f("rank_max") || "SS"}>{ranks.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label className="label" htmlFor="suggested_level">Suggested level</label><input className="input" type="number" min={1} id="suggested_level" name="suggested_level" defaultValue={f("suggested_level") || 1} /></div>
          <div><label className="label" htmlFor="party_min">Party min</label><input className="input" type="number" min={1} id="party_min" name="party_min" defaultValue={f("party_min") || 3} /></div>
          <div><label className="label" htmlFor="party_max">Party max</label><input className="input" type="number" min={1} id="party_max" name="party_max" defaultValue={f("party_max") || 5} /></div>
          <div><label className="label" htmlFor="est_minutes">Est. minutes</label><input className="input" type="number" min={30} step={15} id="est_minutes" name="est_minutes" defaultValue={f("est_minutes") || 180} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="reward_preview">Possible rewards (shown to players)</label><input className="input" id="reward_preview" name="reward_preview" defaultValue={f("reward_preview")} placeholder="75 gold · 40 renown" /></div>
          <div><label className="label" htmlFor="content_advisories">Content advisories (comma-separated)</label><input className="input" id="content_advisories" name="content_advisories" defaultValue={quest?.content_advisories.join(", ") ?? ""} /></div>
        </div>
        <div>
          <label className="label" htmlFor="objectives">Objectives (one per line; prefix with [secret] to hide from players)</label>
          <textarea className="input min-h-[100px] font-mono text-sm" id="objectives" name="objectives" defaultValue={(objectives ?? []).map((o) => (o.is_secret ? "[secret] " : "") + o.description).join("\n")} />
        </div>
      </section>
      <section className="panel grid gap-4 border-ember/40">
        <h2 className="heading text-lg">GM only — never shown to players</h2>
        <div><label className="label" htmlFor="gm_notes">Storyline &amp; secrets</label><textarea className="input min-h-[120px]" id="gm_notes" name="gm_notes" defaultValue={secrets?.gm_notes ?? ""} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="npcs">NPCs</label><textarea className="input min-h-[80px]" id="npcs" name="npcs" defaultValue={secrets?.npcs ?? ""} /></div>
          <div><label className="label" htmlFor="encounter_notes">Encounters &amp; maps</label><textarea className="input min-h-[80px]" id="encounter_notes" name="encounter_notes" defaultValue={secrets?.encounter_notes ?? ""} /></div>
        </div>
        <div><label className="label" htmlFor="consequence_hooks">Consequence hooks (which world flags / locations this can change)</label><textarea className="input min-h-[80px]" id="consequence_hooks" name="consequence_hooks" defaultValue={secrets?.consequence_hooks ?? ""} /></div>
      </section>
      <SubmitButton>{quest ? "Save quest" : "Draft quest"}</SubmitButton>
    </form>
  );
}
