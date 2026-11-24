import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from rules_data import *

OUT = '/home/user/everbound/presentation/docs/Everbound_Core_Rules_v0.1.md'
W = []
w = W.append
w("""# EVERBOUND — Core Rules

**Version:** 0.1 — first playable draft · **Date:** November 23, 2026
**Status:** Proposed for playtesting. Every number here is a starting guess.
**Builds on:** Complete Character Progression Compendium v1.3 (classes, specializations, racial trees, synergies) and Guild Trials v1.0.

> **One rule to remember:** roll **d20 + attribute + training**, and meet or beat the number.

## 1. The six attributes

Each attribute is a modifier from **−1 to +5** that you add to rolls. There are no separate 3–18 scores.

| Attribute | What it measures | Skills |
|---|---|---|
""")
for a, m, s in ATTRS:
    w(f"| **{a}** | {m} | {', '.join(s)} |\n")
w("""
## 2. The 18 skills

You are **trained** in a skill or not. Trained skills add your **Training bonus** (+2 at level 1, see the level table).

| Skill | Attribute | Used for |
|---|---|---|
""")
for a, m, s in ATTRS:
    for sk in s:
        w(f"| **{sk}** | {a} | {SKILLS[sk]} |\n")
w("""
## 3. Building a character

1. **Choose a race.** Gain its HP bonus, **+1 to one attribute** and its movement.
2. **Choose a lineage.** Gain the free lineage trait and **one trained skill** (table in section 5).
3. **Choose a class.** Gain its HP, Guard, **+1 to its primary attribute**, two trained Resists, its trained skills and its four starting abilities.
4. **Spend 6 attribute points.** Every attribute starts at 0. Each point adds +1, up to +3 before race and class bonuses. You may lower one attribute to −1 for one extra point. Highest possible at level 1: +4.
5. **Work out HP and Guard** (section 6).
6. **Pick starting gear:** your class weapons, armor if your class uses it, an adventurer's pack and 50 gold.

## 4. Races

| Race | HP bonus | +1 attribute | Move (squares) | Note |
|---|---|---|---|---|
""")
for r, hp, at, mv, note in RACES:
    w(f"| **{r}** | +{hp} | {at} | {mv} | {note} |\n")
w("""
One square is about 5 feet. Lower HP bonuses are balanced by mobility or senses, never by weaker skills.

## 5. Lineage trained skills

| Race | Lineages and trained skill |
|---|---|
""")
for r, lst in LINEAGE_SKILL.items():
    w(f"| **{r}** | " + " · ".join(f"{l}: {s}" for l, s in lst) + " |\n")
w("""
If the lineage skill is one you already have from your class, pick any other skill instead.

## 6. Classes and core numbers

| Class | Starting HP | HP per level | Guard | Primary (+1) | Trained Resists | Trained skills | Recovery die |
|---|---|---|---|---|---|---|---|
""")
for c, hp, hpl, g, p, res, n, sks, rd in CLASSES:
    w(f"| **{c}** | {hp} | +{hpl} | {g} | {p} | {res} | Pick {n}: {', '.join(sks)} | {rd} |\n")
w("""
- **Health (HP)** at level 1 = **10 + race bonus + class HP + Vigor**. Each new level adds **class HP per level + Vigor** (minimum +1).
  - Example: Dwarf Vanguard with Vigor +2 → 10 + 4 + 12 + 2 = **28 HP**. Sylph Arcanist with Vigor 0 → 10 + 0 + 6 + 0 = **16 HP**.
- **Guard** is how hard you are to hit (like armor class). A shield adds +1.
- **Ability DC** (what enemies roll against for your abilities) = **8 + Training + your power attribute** (Arcanist: Wits · Luminary: Insight · Resonant: Presence · everyone else: their primary).
- **Weapons:** Light **d6** (dagger, sling, hand axe) · Standard **d8** (sword, spear, bow, staff) · Heavy **d10** (two-handed: greataxe, warhammer, longbow). Add Might for heavy and most melee weapons, Grace for light and ranged ones.

## 7. Rolling

**Check:** d20 + attribute + Training (if trained) vs a **Difficulty**.

| Difficulty | Number |
|---|---|
""")
for d, n in DIFFICULTY:
    w(f"| {d} | {n} |\n")
w("""
- **Edge:** roll two d20s, keep the higher. **Strain:** keep the lower. Edge and Strain cancel; they never stack.
- **Help:** one ally with a good reason gives you Edge.
- **Group check:** everyone rolls; the group succeeds if at least half succeed.
- **Resist** (like a saving throw): d20 + attribute (+ Training if your class is trained in that Resist) vs the effect's DC.
- **Natural 20** on a check: a great success with an extra benefit. **Natural 1**: a complication. You still succeed if the total beats the Difficulty, but something goes wrong.
- **Passive Perception** = 10 + Perception total; the GM uses it for things you'd notice without trying.

## 8. Combat

**Initiative:** d20 + Grace, highest first; on a tie, players go first.

**On your turn:**
- **Move:** up to your move in squares.
- **Action:** one of Attack, use an ability, Dash (move again), Help, Defend (+2 Guard and Edge on Resists until your next turn), use an item, or make a check.
- **Reaction:** once per round, on anyone's turn: an Opportunity Strike when an enemy leaves your reach, or a reaction ability.
- Talking, drawing a weapon and dropping an item are free.

**Attack:** d20 + attribute + Training vs the target's Guard. **Damage:** weapon or ability dice + attribute.
- **Natural 20:** critical hit, roll the damage dice twice. **Natural 1:** miss.

**Ability uses:** Core Techniques are unlimited. "1/encounter" abilities, Signature abilities and racial Tier III skills come back when the encounter ends.

**Conditions:**

| Condition | Effect | Ends |
|---|---|---|
""")
for c, e, en in CONDITIONS:
    w(f"| **{c}** | {e} | {en} |\n")
w("""
### Downed and Last Breath

At **0 HP** you are **Downed**. At the start of each of your turns, roll a d20: **10 or more** is a success, **9 or less** is a failure. Taking damage while Downed counts as one failure.

- **3 successes:** you are stable at 0 HP.
- **Any healing**, or an ally stabilizing you (Medicine vs Standard 12, or Rite of Clarity), brings you back.
- **3 failures:** you have **Fallen**. You are out for the rest of the encounter and wake at 1 HP afterwards with a **Lingering Wound**: a story tag the GM uses until your next session.
- **No permanent death** unless the player chooses a Heroic Sacrifice.

## 9. Recovery

- **Recovery Dice:** you have one per level, of your class's Recovery die.
- **Breather** (about 10 minutes in the story; up to two per session): spend any number of Recovery Dice, rolling each and adding Vigor, and heal that much.
- **Between sessions:** HP, Recovery Dice and all uses reset when you next check in.

## 10. Levels and progression

| Level | XP | Training | Skill Points (total) | Racial Points (total) | Also |
|---|---|---|---|---|---|
""")
for lv, xp, tr, sp, rp, o in LEVELS:
    w(f"| {lv} | {xp:,} | {tr} | {sp} | {rp} | {o} |\n")
w("""
- **SP** buy class-tree and specialization skills (1 each). Reaching 5 SP in the class tree (level 4) makes you eligible for a **Guild Trial**. Passing a trial also awards **+1 bonus SP**.
- **RP** buy racial skills (1 each). Five RP is exactly enough for a capstone by level 9.
- **Attribute increases** at levels 4 and 8: +1 to one attribute (maximum +5).
- XP thresholds match the website's current level curve.

## 11. Starting abilities with numbers (first pass)

These add numbers to the 24 starting abilities from the Class Compendium. Effects at L5 and L9 grow as noted.

""")
for c, abil in STARTERS.items():
    w(f"### {c}\n\n" + "\n".join(f"- {a}" for a in abil) + "\n\n")
w("""## 12. The session workflow

""")
for i, (t, d) in enumerate(WORKFLOW, 1):
    w(f"{i}. **{t}** — {d}\n")
w("""
A three-hour session usually has 4–6 scenes and 2–3 encounters. Between sessions players level up (SP, RP, attributes), run errands, craft, trade at the Auction Hall and book Guild Trials.

## 13. What the website will track

Attributes · trained skills and Resists · HP, max HP, Guard, move · Recovery Dice · ability uses · conditions · level, XP, SP and RP spent · specialization and trial status · racial skills · synergy slot · inventory · Lingering Wounds.

## 14. Decisions for you

""")
for t, d in OPEN:
    w(f"- **{t}:** {d}\n")
w("""
---
*EVERBOUND — The Living Adventurers Guild · Core Rules v0.1*
""")
open(OUT, 'w').write(''.join(W))
print('doc ok', OUT)
