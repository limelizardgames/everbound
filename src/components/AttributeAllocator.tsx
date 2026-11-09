"use client";
import { useState } from "react";

export function AttributeAllocator({ attributes, min, max, points }: { attributes: { key: string; label: string; hint?: string }[]; min: number; max: number; points: number }) {
  const [vals, setVals] = useState<Record<string, number>>(Object.fromEntries(attributes.map((a) => [a.key, min])));
  const used = Object.values(vals).reduce((a, b) => a + b, 0);
  const left = points - used;
  return (
    <fieldset>
      <legend className="label">Attributes · <span className={left < 0 ? "text-ember" : "text-arcane-light"}>{left} points left</span></legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {attributes.map((a) => (
          <div key={a.key} className="flex items-center justify-between gap-3 rounded-lg border border-midnight-600 p-3">
            <div>
              <div className="font-semibold">{a.label}</div>
              {a.hint && <div className="muted text-xs">{a.hint}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost btn-sm w-9" aria-label={`Decrease ${a.label}`} disabled={vals[a.key] <= min}
                onClick={() => setVals((v) => ({ ...v, [a.key]: v[a.key] - 1 }))}>−</button>
              <output className="w-6 text-center font-display text-xl text-gold-light" aria-live="polite">{vals[a.key]}</output>
              <button type="button" className="btn-ghost btn-sm w-9" aria-label={`Increase ${a.label}`} disabled={vals[a.key] >= max || left <= 0}
                onClick={() => setVals((v) => ({ ...v, [a.key]: v[a.key] + 1 }))}>+</button>
              <input type="hidden" name={`attr_${a.key}`} value={vals[a.key]} />
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
