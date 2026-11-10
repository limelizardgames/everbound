"use client";
import { useState } from "react";
import Link from "next/link";
import { ClassIcon } from "@/components/ClassIcon";
import { Meter, SystemWindow } from "@/components/ui";

type Cls = { key: string; label: string; hp_base: number; role?: string };

/** Flavor for the starter rules; unknown classes still render from rule-set data. */
const FLAVOR: Record<string, { quote: string; body: string; stats: [number, number, number, number]; color: string }> = {
  warrior: { quote: "Stand behind me.", body: "First through the door and last to fall. Warriors hold the line so the rest of the party can shine.", stats: [4, 2, 1, 1], color: "#E0533D" },
  ranger: { quote: "I saw them an hour ago.", body: "Scouts, trackers and deadly shots. Rangers read the wild like a book and strike before the enemy knows.", stats: [1, 4, 2, 1], color: "#4ADE80" },
  rogue: { quote: "It was unlocked. Eventually.", body: "Locks, traps, pockets and plans. Rogues solve problems sideways and always know another way out.", stats: [1, 4, 3, 0], color: "#B07CFF" },
  cleric: { quote: "Hold still. This will sting.", body: "Menders of wounds and breakers of curses. A party with a cleric walks home; a party without one is carried.", stats: [2, 1, 1, 4], color: "#F0D79A" },
  mage: { quote: "Technically, that was the plan.", body: "Scholars of the arcane who bend the rules of the world. Fragile, brilliant, and occasionally on fire.", stats: [0, 1, 4, 3], color: "#46BDD6" },
  bard: { quote: "Everyone remember where we parked the cart.", body: "Voices that turn the tide. Bards inspire allies, talk down trouble and remember every story worth telling.", stats: [0, 2, 2, 4], color: "#F2A541" },
};
const ATTRS = ["Might", "Grace", "Wits", "Spirit"];
const DEFAULTS: Cls[] = [
  { key: "warrior", label: "Warrior", hp_base: 14, role: "Frontline defender" }, { key: "ranger", label: "Ranger", hp_base: 12, role: "Scout and marksman" },
  { key: "rogue", label: "Rogue", hp_base: 10, role: "Infiltrator and trickster" }, { key: "cleric", label: "Cleric", hp_base: 10, role: "Healer and protector" },
  { key: "mage", label: "Mage", hp_base: 8, role: "Wielder of arcane power" }, { key: "bard", label: "Bard", hp_base: 9, role: "Inspiration and lore" },
];

export function ClassShowcase({ classes }: { classes?: Cls[] }) {
  const list = classes?.length ? classes : DEFAULTS;
  const [sel, setSel] = useState(list[0].key);
  const c = list.find((x) => x.key === sel) ?? list[0];
  const f = FLAVOR[c.key] ?? { quote: "A new path.", body: c.role ?? "", stats: [2, 2, 2, 2] as [number, number, number, number], color: "#46BDD6" };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,320px),1fr]">
      <div role="group" aria-label="Choose a class" className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {list.map((x) => (
          <button key={x.key} type="button" className="pick" aria-pressed={x.key === sel} onClick={() => setSel(x.key)}>
            <span style={{ color: (FLAVOR[x.key]?.color) ?? "#46BDD6" }}><ClassIcon name={x.key} className="h-9 w-9" /></span>
            <span className="min-w-0">
              <span className="block font-display text-lg leading-tight text-parchment">{x.label}</span>
              <span className="block truncate font-ui text-[12px] font-semibold uppercase tracking-[0.14em] text-parchment/55">{x.role}</span>
            </span>
          </button>
        ))}
      </div>
      <SystemWindow title="Class Preview" right={<span className="hud-num text-[13px] uppercase tracking-[0.2em] text-parchment/60">Base HP {c.hp_base}</span>}>
        <div key={c.key} className="animate-popin grid gap-6 sm:grid-cols-[auto,1fr] sm:items-center">
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-white/10" style={{ background: `radial-gradient(circle, ${f.color}33, transparent 68%)`, color: f.color }}>
            <span aria-hidden className="absolute inset-2 rounded-full border border-dashed opacity-40" style={{ borderColor: f.color }} />
            <ClassIcon name={c.key} className="h-24 w-24 drop-shadow-[0_0_14px_currentColor]" />
          </div>
          <div>
            <h3 className="font-display text-3xl text-parchment">{c.label}</h3>
            <p className="font-ui text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: f.color }}>{c.role}</p>
            <p className="mt-3 font-display italic text-gold-light">“{f.quote}”</p>
            <p className="muted mt-2 text-sm">{f.body}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2">
              {ATTRS.map((a, i) => <Meter key={a} label={a} value={f.stats[i]} max={4} tone={i === 0 ? "hp" : i === 1 ? "forest" : i === 2 ? "arcane" : "xp"} />)}
            </div>
            <p className="muted mt-2 text-xs">Suggested build. You assign your own points at character creation.</p>
          </div>
        </div>
        <div className="mt-6 text-right"><Link href="/join/" className="btn-gold btn-sm">▸ Play a {c.label}</Link></div>
      </SystemWindow>
    </div>
  );
}
