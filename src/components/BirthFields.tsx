"use client";
import { useState } from "react";
import { ageFrom } from "@/lib/actions";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Birth month + year, with a guardian-consent box that appears for under-18s. */
export function BirthFields({ minAge = 13 }: { minAge?: number }) {
  const [y, setY] = useState(""); const [m, setM] = useState("");
  const now = new Date().getFullYear();
  const age = y && m ? ageFrom(Number(y), Number(m)) : null;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor="birth_month">Birth month</label>
          <select id="birth_month" name="birth_month" className="input" required value={m} onChange={(e) => setM(e.target.value)}><option value="">Month</option>{MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></div>
        <div><label className="label" htmlFor="birth_year">Birth year</label>
          <select id="birth_year" name="birth_year" className="input" required value={y} onChange={(e) => setY(e.target.value)}><option value="">Year</option>{Array.from({ length: 90 }, (_, i) => now - 10 - i).map((yr) => <option key={yr} value={yr}>{yr}</option>)}</select></div>
      </div>
      {age !== null && age < minAge && <p className="rounded-sm border border-ember/50 bg-ember/10 p-3 text-sm">Everbound is for adventurers aged {minAge} and up. We&apos;d love to see you when you&apos;re older!</p>}
      {age !== null && age >= minAge && age < 18 && (
        <label className="flex items-start gap-3 rounded-sm border border-gold/40 bg-gold/5 p-3 text-sm">
          <input type="checkbox" name="guardian_consent" required className="mt-1 h-5 w-5 accent-gold" />
          <span>A parent or guardian knows I&apos;m joining Everbound, has read the Guild&apos;s rules, and has given me permission.</span>
        </label>
      )}
      <p className="muted text-xs">We only keep your birth month and year. Some quests are rated for older players because of their themes.</p>
    </div>
  );
}
