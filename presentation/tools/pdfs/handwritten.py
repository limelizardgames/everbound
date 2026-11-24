A = '<span class="badge approved">APPROVED</span>'
D = '<span class="badge draft">DRAFT</span>'

ALLEGIANCES = f"""
## Purpose

How adventurers choose a side in the world's conflicts, and how party-vs-party (PvP) play works. This feature is **live on the website**; names and numbers can still change.

## The three allegiances {D}

| Allegiance | Motto | Description | In two-sided raids |
|---|---|---|---|
| **The Adventurers Guild** | Protect the realm | Everyone starts here. Defend the towns, recover the sigils and stand against what wakes beyond the gate. | Raiders |
| **The Ashen Covenant** *(working name; rename pending)* | Serve the Wyrm | Cultists who want the Crimson Wyrm free. They sabotage sigil hunts and guard the Wyrm's lair. | Defenders |
| **The Free Companies** | Gold before glory | Mercenaries loyal to coin. They take contracts from either side and can tip a close fight. | Choose a side at sign-up |

**Open item:** rename the Ashen Covenant. Keep the new name clear of race and lineage words (ash, ember, cinder, smoke, wyrm, crimson). Ideas so far: *The Sealbreakers*, *The Hollow Accord*, *The Order of the Open Gate*. Names are edited in the Command Center (Names & Lore); see EB-11.

## Pledging {D}

- Every adventurer begins in the Adventurers Guild.
- From guild rank **D**, an adventurer may pledge to another allegiance on their portal's Allegiance page. Returning to the Guild is allowed at any rank.
- After changing, they must wait **90 days** before changing again.
- Nobody can switch sides while signed up for a raid or a PvP quest.
- Administrators can correct an allegiance from Players & Moderation; a reason is required and the change is audited.
- Rank and cooldown are settings (`allegiance_min_rank`, `allegiance_cooldown_days`).

## Party vs party {D}

PvP is **opt-in** per adventurer and can be turned off at any time unless they are signed up for a PvP quest or a two-sided raid.

| Mode | How it works |
|---|---|
| **Skirmish** | Two parties of opposing allegiances clash at the store, with a Guild Master refereeing. |
| **Contested quest** | Rival parties race for the same objective; the winner's side moves the world's counters. Sample: *Clash at the Ashen Crossroads* (rank D+). |
| **Two-sided raid** | Covenant adventurers defend the lair while Guild adventurers raid it; Free Companies choose. Registration requires PvP to be on. The Crimson Wyrm is set up as two-sided. |

## Safeguards {A}

- PvP is always opt-in; nobody fights another player without choosing to.
- A Guild Master referees every clash, in person.
- Rivals in the story, friends at the table: the Code of Conduct (EB-08) always applies.
- No pressuring anyone into PvP or into an allegiance; no singling out the same player; no real-world grudges.

## Related rules

- Combat procedure, conditions and Downed rules: **EB-01 Core Rules**.
- The raid, world counters and places: **EB-09 World & Lore**.
"""

WORLD = f"""
## Purpose

The starting state of the shared world that every table plays in. All content here is **fictional seed content** for the pilot and can be rewritten; the website stores it and updates it as sessions are approved.

## Regions and places {D}

| Place | Region | Status | Summary | Lore / threat |
|---|---|---|---|---|
{{LOCATIONS}}

Undiscovered places (the Crimson Peaks and the Sunken Abbey) stay hidden from players until a party finds them.

## World counters {D}

Counters ("world flags") rise and fall as approved sessions report results. Public ones appear on the world map.

| Counter | Starting value | Public |
|---|---|---|
{{FLAGS}}

## The Crimson Wyrm raid {D}

- **State:** foreshadowed. *"The guild has recovered three of the five ancient sigils. Something stirs beyond the gate."*
- **Unlocks** automatically when *Ancient sigils recovered* reaches **5**. A Chronicle proclamation is published and every player is notified.
- Stages: Dormant → Foreshadowed → Unlocked → Registration → Active → Resolved.
- Set up as a **two-sided raid** (EB-07).

## Starting quests {D}

| Quest | Type | Ranks | Difficulty | Summary |
|---|---|---|---|---|
{{QUESTS}}

## The Chronicle (opening news) {D}

{{CHRONICLE}}

## Guild ranks {A}

Rank reflects reputation (renown), separate from character level and skills (EB-01, EB-02).

| Rank | Title | Renown needed | Card design |
|---|---|---|---|
{{RANKS}}

**To review:** rank **C is titled "Vanguard"**, the same as the Vanguard class. Consider renaming the rank title (for example *Warden* or *Sentinel*).

## Allegiances

The world's factions and how players join them: **EB-07 Allegiances & PvP**.
"""

CONDUCT = f"""
## Purpose

The charter every adventurer agrees to when claiming a guild card. It is **live on the website** at /conduct/. It is marked draft because it has not had a legal review and Oath I is still being reworded.

## The Ten Oaths of the Guild {D}

*Carved upon the Great Bell of Highmere. Every adventurer speaks these words when their guild card first answers to their name.*

| | Oath | What it means |
|---|---|---|
| I | Raise no blade against a guildmate. | Respect every player. No harassment or bullying. |
| II | Let the X be honoured, and the tale turn aside. | Respect the safety tools, no questions asked. |
| III | Wear the villain's mask, never the villain's heart. | Your character can be a villain. You can't be a jerk. |
| IV | Guard the true names of others as your own. | Never share anyone's personal details. |
| V | Share the fire; every blade deserves its moment. | Share the spotlight at the table. |
| VI | Shield the young, for they are the Guild's future. | Keep games safe for players aged 13–17. |
| VII | One card, one soul, one oath. | One account and one card per person. |
| VIII | Gold of Everbound stays in Everbound. | No trading items or gold for real money. |
| IX | Honour the Hall that shelters the Guild. | Respect the store, its staff and its stock. |
| X | Heed the Guild Master's word, and speak your grievance after. | Disagree politely, and appeal through the proper channels. |

**Pending:** Oath I conflicts with opt-in PvP. Suggested: *"Raise no blade against a guildmate outside the field of honour."* The oaths are edited in the Command Center (Names & Lore).

## I. Respect every adventurer

Everbound is for everyone. No harassment, discrimination or bullying of any kind — including about race, ethnicity, religion, gender, gender identity, sexual orientation, disability, age, body or experience level.

- Use the names and pronouns people ask you to use.
- No unwanted physical contact; respect personal space at the table.
- No threats, intimidation, stalking or following someone around the store or online.
- New players are welcome. Help them learn; never mock someone for not knowing the rules.

## II. At the table

Every session starts with a quick **session zero**: the Guild Master explains the quest's themes and content advisories and checks what everyone is comfortable with.

- **The X-card.** Anyone can tap the X-card, or say "let's skip this", to remove something from the scene. No explanation needed.
- **Lines and veils.** Some content is never in our games (a line); some happens off-screen (a veil).
- **Share the spotlight.** Don't talk over people or play their characters for them.
- **In-character is not an excuse.** Targeting a real person through your character is not allowed.
- **Rivals in the story, friends at the table.** In PvP your character fights the other side's characters, never the players. PvP is opt-in and refereed (EB-07).
- **The Guild Master's ruling stands** for the session. Disagree politely and raise it afterwards.
- Arrive on time and cancel early so someone on the waitlist can play.

## III. In the Guild Tavern (online chat)

- The same respect rules apply online as in person.
- **Never share personal contact details**, yours or anyone else's. The Tavern blocks emails and phone numbers automatically.
- No spam, advertising, explicit content, or content unsuitable for a 13-year-old.
- Use **Report** and **Block**. Keep quest spoilers out of general channels.

## IV. Young adventurers (ages 13–17)

- Everbound is for ages 13 and up; some quests are rated 15+ or 18+.
- Under-18s need a parent or guardian's permission, confirmed when they claim their card.
- Adults must never ask a minor for contact details, invite them to private chats or meet-ups outside Guild events, or message them on other platforms.
- Content stays appropriate for the youngest player present.
- If an under-18 adventurer is suspended, we contact their parent or guardian.
- Anything that puts a young adventurer's safety at risk skips straight to suspension or ban, and may be reported to the authorities.

## V. Fair play

- **One account and one guild card per person.**
- **No real-money trading** of gold, items or characters. Trade only through the Auction Hall.
- Don't exploit bugs; report them.
- Don't pressure others into trades, PvP or your allegiance.
- In PvP, don't single out the same player again and again or settle real-world grudges.
- Riddle answers are for solving, not posting.

## VI. Respect the store

Treat the partner store's staff, customers and stock with respect, tidy your table, and follow the store's own rules. A store can refuse service.

## VII. Consequences

| Step | Response | What it means |
|---|---|---|
| I | Warning | A Guild Master talks with you; a note goes on your record. |
| II | Chat mute | You can read the Tavern but not post, for an hour up to a week. |
| III | Suspension | No quests, chat, trading or errands for a set time, usually 1–4 weeks. Lifts automatically. |
| IV | Ban | Your account is closed and your guild card retired. |

- **Serious incidents skip steps** (harassment, threats, violence, discrimination, or anything affecting a young adventurer's safety).
- **Bookings during a suspension:** sessions after it ends are kept; sessions during it must be rescheduled or cancelled in time, or they are forfeited without refund. Banned accounts can cancel but not reschedule.
- Characters, gold and items are kept during a suspension.

## VIII. Reporting and appeals

- **At the table:** tell your Guild Master, privately if you prefer.
- **Online:** use Report, or tell any Guild Master.
- **About a Guild Master:** tell the other founder. Every reward, card change and restriction is logged.
- Nobody is punished for reporting in good faith.
- **Appeals:** a suspended or banned adventurer can appeal once from their portal; a different Guild Master reviews it.

How moderation works in the Command Center: **EB-11 Platform & GM Handbook**.
"""

BUSINESS = f"""
## Purpose

The business view of Everbound: how it runs, how it earns, what it costs, what is legally required and what comes next. Everything here is a plan, not a commitment.

## The model {D}

Everbound is a persistent tabletop RPG played in person at a partner game store, connected to an online guild (the website). Players carry a physical guild card; their progress, the shared world and the community live online.

| Audience | What they get |
|---|---|
| **Players (13+)** | Progress that never resets, sessions to book, things to do between sessions, a real card to carry. |
| **Partner store** | Regular weekly visits, merchandise sales, a community anchored at the store, no software to run. |
| **Guild Masters** | A tablet roster, rewards recorded in one place, a world that updates itself, moderation tools. |

## Revenue {D}

| Stream | Pilot pricing (sample) | Notes |
|---|---|---|
| Session seats | $10–20 per seat | Core revenue. Booked online; pay online (Stripe) or at the store. |
| Guild Store | $5–22 per item | {{PRODUCTS}}. Physical goods, picked up at the store. |
| Repeat visits | — | The persistent story brings players back weekly; value to the partner store. |

**Never pay-to-win:** real money buys seats and physical goods only. In-game gold is always earned by playing.

## Costs {D}

| Item | Estimate |
|---|---|
| Website hosting (GitHub Pages) | Free |
| Supabase (database, logins, chat) | Free for the pilot; Pro about $25/month at launch (backups) |
| Custom domain | About $12/year |
| Card payments (Stripe) | 2.9% + 30¢ per charge, if enabled |
| Guild card printing | Quotes needed |
| Email sender (SMTP) | Free tier available from most providers |

## Operations {D}

- Partner store: two tables, weekly nights.
- Founders claim their cards and get owner/admin roles (EB-11).
- Print the 12 founding cards.
- Recruit and train Guild Masters, including how to run Guild Trials (EB-06).
- Session zero and the X-card at every table (EB-08).
- Set up an email sender for sign-ups, and weekly database backups.

## Legal and safety {D}

| Item | Status |
|---|---|
| Code of Conduct and Ten Oaths | Live; legal review pending (EB-08) |
| Age 13+, guardian permission under 18 | Live |
| Moderation: mute, suspend, ban, appeal | Live |
| Trademark check: "Everbound" and faction names | To do |
| Privacy policy | To do |
| Refund and no-show terms | To do |
| Tavern rules for ages 13–17 | To do |
| Store partner terms and revenue share | To do |

## Roadmap {D}

| Phase | What happens |
|---|---|
| **Now: platform live** | Website, guild cards, booking, world, raids, errands, crafting, auctions, allegiances and PvP, Command Center, moderation. |
| **Next: Founding Guild pilot** | Print the founding cards, playtest sessions at the partner store, finalize rules (EB-01), prices and terms, set up email, backups and legal review. |
| **Later: public launch** | Online payments, the first two-sided raid, grow the Guild Master team and partner stores; update the website to the final classes, races and lineages. |

## Open questions {D}

- Final seat price (guess: $15).
- First playtest date (guess: January 2027).
- Final allegiance names (EB-07).
"""

def index_md(docs):
    rows = "\n".join(f"| **{d['id'].replace('-', chr(0x2011))}** | {d['title']} | {d['version']} | {d['status_html']} | {d['purpose']} |" for d in docs)
    return f"""
## How to use this set

Each topic has its own PDF. Every document carries a status on its cover, and mixed documents mark each section:

- {A} — decided by the founders. Change only on purpose.
- {D} — proposed or in progress. Expect changes after playtesting.

Documents refer to each other by number (for example, "see EB-04").

## The documents

| No. | Document | Version | Status | What it covers |
|---|---|---|---|---|
{rows}

## How they fit together

- **EB-01 Core Rules** is the engine: dice, attributes, skills, HP, combat, levels and the session workflow.
- A character is built from a race and lineage (**EB-03**), a class (**EB-02**) and the rules in **EB-01**.
- Characters grow through class trees and specializations (**EB-02**), earned via **EB-06 Guild Trials**, and racial trees (**EB-04**). **EB-05** links lineage and specialization.
- They play in the shared world (**EB-09**), may pick a side (**EB-07**), and agree to the Code of Conduct (**EB-08**).
- **EB-10** is the business plan, **EB-11** explains running the website and sessions, and **EB-12** records every decision.

## Source files

The editable sources are Markdown files in the repository's `presentation/docs/` folder, together with the lineage art and the whiteboard.
"""

def decisions_md():
    return f"""
## Purpose

A record of what the founders have decided, so the other documents can be checked against it. Items under "Still open" are not decided.

## Platform and business {A}

| Decision | Detail |
|---|---|
| Hosting | Static website on GitHub Pages at everbound.limelizardgames.com; Supabase database. |
| Accounts | No register page. Scanning an unclaimed guild card creates the account, and the card is then locked to it. |
| Card links | Each card's QR code opens /card/?t=&lt;token&gt;. |
| Ages | 13+ (some quests rated 15+); guardian permission under 18. May be raised later. |
| Guild ranks | F through SS. |
| Auction Hall | Unlocks at rank E; gold only. |
| Errands | Rewards are materials and small amounts of gold only. |
| Professions | Crafting professions (blacksmithing, alchemy and more) are part of the game. |
| Moderation | GMs act as admins for now and will later get discretion with an appeal process. A suspension that ends before a booked session keeps the booking; otherwise reschedule or cancel in time, or the booking is forfeited without refund. |
| PvP | Optional allegiances with opt-in party-vs-party play. |
| Names | Faction names and the Ten Oaths are editable in the Command Center. |
| Website tracking | The website tracks SP, RP, synergy slots and Guild Trials in each profile. |
| Website update | The website switches to the final classes, races and lineages once the rules are final. |

## Characters and world {A}

| Decision | Detail |
|---|---|
| Classes | Six fixed classes: Vanguard, Wildstrider, Shadowblade, Luminary, Arcanist, Resonant. No custom classes. |
| Specializations | Three per class (18 total), earned through a Guild Trial; one active at a time. |
| Races | 12 races × 5 lineages = 60 lineages (EB-03). Any lineage can play any class. |
| Lineage art | The Lineage Handbook art is the visual standard. Skyborn have full bird heads. |
| Synergy names | Keep all 360 technique names as flavour; techniques on the same specialization share one effect. |
| Recommendations | No specialization is recommended for any lineage. |
| Renames | Wolfkin Beastwarden technique: Packtrail Bond. Crystalforged Tier II: Lattice Brace. Frost Orc capstone: Icefang Trek. |
| Trait and Tier I | Overlap kept; Tier I adds more on top of the trait. |
| Racial skills in combat | Racial skills stay mostly exploration; class carries combat. |
| Skill format | Every racial skill and synergy has player-visible Effect and Limits lines. |
| Skill names kept | Steady Pulse, Measured Blow and Ice Brace stay as written. |
| Trademark note | "Highlander" trademark concern: ignored. |

## Still open {D}

| Item | Where |
|---|---|
| Rename the Ashen Covenant | EB-07 |
| Reword Oath I for PvP | EB-08 |
| Rank C title "Vanguard" clashes with the class name | EB-09 |
| Core rules: dice, six vs four attributes, death, damage between sessions, starting numbers | EB-01 |
| Guild Trials: SP milestone, default format, retries, group help, cross-spec training | EB-06 |
| Seat price, playtest date, legal documents | EB-10 |
"""
