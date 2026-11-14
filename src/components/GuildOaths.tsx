"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/env";

export type Oath = { oath: string; plain: string };
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const DEFAULTS: [string, string, string][] = [
  ["I", "Raise no blade against a guildmate.", "Respect every player. No harassment or bullying."],
  ["II", "Let the X be honoured, and the tale turn aside.", "Respect the safety tools, no questions asked."],
  ["III", "Wear the villain's mask, never the villain's heart.", "Your character can be a villain. You can't be a jerk."],
  ["IV", "Guard the true names of others as your own.", "Never share anyone's personal details."],
  ["V", "Share the fire; every blade deserves its moment.", "Share the spotlight at the table."],
  ["VI", "Shield the young, for they are the Guild's future.", "Keep games safe for players aged 13–17."],
  ["VII", "One card, one soul, one oath.", "One account and one card per person."],
  ["VIII", "Gold of Everbound stays in Everbound.", "No trading items or gold for real money."],
  ["IX", "Honour the Hall that shelters the Guild.", "Respect the store, its staff and its stock."],
  ["X", "Heed the Guild Master's word, and speak your grievance after.", "Disagree politely, and appeal through the proper channels."],
];

/** The original wording; used until an administrator saves new wording (Command Center → Names & Lore). */
export const DEFAULT_OATHS: Oath[] = DEFAULTS.map(([, oath, plain]) => ({ oath, plain }));

/** Saved wording from admin_settings.guild_oaths, falling back to the defaults. */
export function useOaths(): Oath[] {
  const [oaths, setOaths] = useState<Oath[]>(DEFAULT_OATHS);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let live = true;
    sb().from("admin_settings").select("value").eq("key", "guild_oaths").maybeSingle().then(({ data }) => {
      const v = data?.value as Oath[] | undefined;
      if (live && Array.isArray(v) && v.length === 10 && v.every((o) => o && typeof o.oath === "string" && o.oath.trim())) setOaths(v);
    });
    return () => { live = false; };
  }, []);
  return oaths;
}

export function GuildOaths({ className = "" }: { className?: string }) {
  const OATHS = useOaths().map((o, i) => [NUMERALS[i], o.oath, o.plain] as [string, string, string]);
  return (
    <section aria-labelledby="oaths-title" className={`relative overflow-hidden rounded-md border border-gold/40 bg-gradient-to-b from-[#1a1d2b] to-[#0f1220] p-6 shadow-[inset_0_0_0_1px_rgba(212,170,90,.15),0_0_40px_-15px_rgba(212,170,90,.5)] sm:p-9 ${className}`}>
      <div className="text-center">
        <p className="font-ui text-[12px] font-bold uppercase tracking-[0.35em] text-gold/80">Carved upon the Great Bell of Highmere</p>
        <h2 id="oaths-title" className="heading mt-2 text-3xl sm:text-4xl">The Ten Oaths of the Guild</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm italic text-parchment/70">Every adventurer speaks these words when their guild card first answers to their name. The bell remembers who breaks them.</p>
        <div aria-hidden className="mx-auto mt-5 h-px w-40 bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      </div>
      <ol className="mt-7 grid gap-x-10 gap-y-5 md:grid-cols-2">
        {OATHS.map(([n, oath, plain]) => (
          <li key={n} className="flex gap-4">
            <span className="w-10 shrink-0 text-right font-display text-2xl leading-none text-gold-light">{n}</span>
            <span>
              <span className="block font-display text-[17px] leading-snug text-parchment">{oath}</span>
              <span className="mt-1 block text-[13px] text-parchment/55">{plain}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
