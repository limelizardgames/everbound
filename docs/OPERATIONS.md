# Operations handbook

## Running a session (Game Master)

1. **Command Center → Session Manager → Schedule a session.** This creates the bookable instance and a private party room in the Tavern.
2. At the table, open the session on a tablet. The **Roster** shows each adventurer's level, rank, seat and payment. Update HP and conditions live.
3. **End session → results & rewards**: tick attendance, enter XP, gold and renown, choose loot and achievements, and write a spoiler-safe recap. Optionally add world consequences (flag ± changes, location status changes, a Chronicle story).
4. **Submit for approval.** A Senior GM or admin reviews and clicks **Approve & publish**. Everything is applied in one database transaction: ledgers, inventory, attendance, rank-ups, quest completions, world flags, location changes, Chronicle post, and raid evaluation.

Safeguards built into the database:
- No one can approve rewards for their own character. The other founder approves.
- Approval runs once. Re-submitting or double-clicking cannot pay out twice (idempotency keys).
- If two tables change the same location, the second change is parked under **World Editor → Conflicting updates** for an admin to decide.
- Rewards outside sane per-session limits are rejected.

## Fixing mistakes

Ledgers are append-only. To correct gold, renown or XP, use **Players & Moderation → Correct** with a reason. That records a new +/− entry, and the audit log records who did it.

## Raids

Raids watch a world flag. The seeded *Crimson Wyrm* unlocks automatically when `ancient_sigils` reaches 5: the Raid Center changes, a Chronicle proclamation is published, and every player is notified. Then use **Raid Controller** to open registration, run the raid and resolve it. **Emergency pause** stops automatic transitions, and admins can override the state (logged).

## Age policy

- **Minimum age** to create an account: Command Center → Settings & Orders → *Minimum age to join* (default **13**). Raising it affects new sign-ups only.
- **Under 18:** sign-up requires the player to confirm a parent or guardian's permission. Only birth month and year are stored.
- **Age-rated quests:** in the Quest Creator, set *Age rating* (13+ to 18+) on mature quests. Booking is refused for younger players, or for anyone who hasn't added their birth month and year (they can add it once in Settings; after that only an admin can change it).
- Content advisories on each quest tell players and guardians what to expect.

## Guild Errands & Professions

Players do mini-quests from home: **expeditions** (send your adventurer away for a few hours, then collect materials) and **riddles** (lore questions answered from the Chronicle, quest pages and atlas; checked on the server). Errands pay **materials and at most 50 gold, never XP or renown**.

Materials feed five **professions** (Blacksmithing, Alchemy, Leatherworking, Cooking, Artificing). Each adventurer learns up to two; crafting raises that profession's skill (1–10), separate from character level. Recipes 3+ levels below your skill give almost no skill, so players move on to harder recipes.

- **Post errands / recipes:** Command Center → *Errands & Crafting* (Senior GM). Hide or publish any errand or recipe there.
- **At the table:** in Session Manager, each adventurer on the roster has a *Pack*. Click *Use* on a potion or ration to spend it; this is logged in their inventory.
- **Settings** (`admin_settings`): `expedition_slots` (2), `errand_daily_cap` (8 rewards per 24h), `riddle_attempts_per_day` (5), `profession_slots` (2).
- **New items** for recipes: add a row in Supabase → Table Editor → `items`, then it appears in the recipe form.
- Item descriptions starting "Table effect:" are suggestions for the GM; the rules engine does not enforce them.

## The Auction Hall

Players at Rank E and above can auction tradeable items to each other for gold. Items go into escrow when listed; a bid's gold is held and returned automatically when outbid. Finished auctions settle the next time anyone opens the Auction Hall.

- **Remove a listing:** any Game Master sees a *GM: remove listing* button on each auction. The bid is refunded, the item returns to the seller, and it is written to the audit log.
- **Settings** (Supabase → Table Editor → `admin_settings`): `auction_min_rank` (default `"E"`), `auction_listing_fee` (2 gold), `auction_fee_percent` (5), `auction_max_price` (5000).
- **Bound items:** story artifacts, keys and trophies cannot be sold. To change one item, set `is_tradeable` (and optionally `max_auction_price`) on its row in `items`.

## Allegiances & party-vs-party (PvP)

Every adventurer starts in **The Adventurers Guild**. From guild rank `allegiance_min_rank` (default **D**) they can pledge to another allegiance on **Portal → Allegiance**: **The Ashen Covenant** (defends in two-sided raids) or **The Free Companies** (choose a side at raid sign-up). Changing again is blocked for `allegiance_cooldown_days` (default **90**), and nobody can switch sides while signed up for a raid or a PvP quest. Both settings are in **Settings & Orders**.

- **PvP is opt-in** per adventurer (Portal → Allegiance). It can be turned off at any time unless they are signed up for a PvP quest or two-sided raid.
- **PvP quests:** in the Quest Creator set *Party vs party* to **Skirmish** (rival parties clash) or **Contested** (rival parties race for an objective). Only opted-in adventurers can book them, and the Quest Board shows a ⚔ PvP tag. Split the table by allegiance at session zero.
- **Two-sided raids:** in the Raid Controller tick *Two-sided raid*. Registration then requires PvP, records each adventurer's side (Covenant → defenders, Guild → raiders, Free Companies choose), and the Raid Center shows the count per side. The seeded Crimson Wyrm is two-sided.
- **Corrections:** administrators can set any adventurer's allegiance from **Players & Moderation** (reason required, ignores rank and cooldown, written to the Audit Log).
- **Factions** live in the `factions` table (name, motto, description, colour, raid side). Rename them there; add new ones with a `slug` and `raid_side`.
- Faction names are working names: check them in the trademark review along with "Everbound".

## Moderation

**Who can do what** (Command Center → Players & Moderation):

| Action | Who |
| --- | --- |
| Remove chat messages, resolve reports, mute (1 hour – 1 week) | Game Master and up |
| Suspend (lifts automatically) | Administrators, any length. Game Masters up to `gm_max_suspension_days` (default **0** = not yet; raise it in Settings & Orders when GMs are ready) |
| Ban (permanent), optionally retiring the guild card | Administrators |
| Restrict an administrator | Owner only |
| Lift a restriction early | Any administrator, or whoever issued it |

Every suspension and ban needs a reason, which the player sees in their portal and in a notification. Nobody can restrict themselves, and everything is written to the Audit Log.

**Bookings during a suspension:** sessions that start *after* the suspension ends are kept. Sessions *during* it are flagged, and the player must reschedule (to a later session of the same or lower price) or cancel within `suspension_response_hours` (default 72) or before the session starts, whichever is sooner. Untouched bookings are canceled as **forfeited** (no refund). For bans, bookings can only be canceled. The roster shows a warning on flagged bookings.

**Appeals:** a restricted player can send one appeal per restriction from their portal. Administrators see it under *Open appeals*. The person who issued the restriction cannot decide its appeal (except the owner). Granting the appeal lifts the restriction; either way the player sees your response.

**Suggested ladder** (publish it as your code of conduct): warning → chat mute → suspension (1–4 weeks) → ban. Skip straight to suspension or ban for harassment, threats or anything affecting a minor's safety; for players aged 13–17, contact a parent or guardian at the suspension stage. Agree bans between both founders.

Tavern messages are filtered for email addresses and phone numbers and rate-limited. Private messaging is intentionally not built.

## Scheduled maintenance (Supabase → Database → Cron)

Enable the `pg_cron` extension, then:

```sql
-- Purge Tavern messages older than the retention setting (default 180 days), nightly at 4am UTC.
select cron.schedule('purge-tavern', '0 4 * * *', $$select public.purge_old_messages()$$);
```

## Backups and restore

- **Automatic**: Supabase Pro ($25/mo) keeps daily backups for 7 days, and Point-in-Time Recovery is an add-on. The free tier has **no automatic backups**, so upgrade before real players' progress matters.
- **Manual**: run this weekly and keep the file somewhere safe.

  ```bash
  pg_dump "postgresql://postgres:PASSWORD@db.YOUR-PROJECT.supabase.co:5432/postgres" \
    --schema=public --schema=auth --no-owner -Fc -f everbound-$(date +%F).dump
  ```

- **Restore test** (do this once before launch): create a scratch Supabase project, then

  ```bash
  pg_restore --no-owner --clean -d "postgresql://postgres:PASSWORD@db.SCRATCH.supabase.co:5432/postgres" everbound-YYYY-MM-DD.dump
  ```

  Sign in on a local build (`npm run dev`) pointed at the scratch project and confirm characters, ledgers and cards look right.

## Investigating problems

- **Audit Log** (admins): every reward approval, card change, role change, raid override and correction.
- **World Editor → World history**: every world-state change, with source session and GM.
- Supabase → **Logs** for API and auth errors. GitHub → **Actions** for failed deploys. Consider adding browser error monitoring (e.g. Sentry) before public launch.
