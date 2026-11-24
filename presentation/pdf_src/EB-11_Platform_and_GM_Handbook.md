<div class="cover">
<div class="brand">EVERBOUND · The Living Adventurers Guild</div>
<div class="docid">EB-11</div>
<h1 class="title">Platform and GM Handbook</h1>
<div class="meta">Version 1.0 · November 23, 2026 · <span class="badge approved">APPROVED</span></div>
<p class="purpose">Setting up and running the live website and the Command Center.</p>
<div class="legend"><span class="badge approved">APPROVED</span> decided by the founders &nbsp; <span class="badge draft">DRAFT</span> proposed, expect changes after playtesting</div>
<div class="related"><b>Related documents</b><ul><li><b>EB-08</b> Code of Conduct and the Ten Oaths</li><li><b>EB-10</b> Business and Operations Plan</li></ul></div>
</div>


Everbound is a **static website hosted on GitHub Pages**, backed by **Supabase**: the database, logins, realtime chat and portrait storage. Every rule (who can claim a card, book a seat, approve rewards…) is enforced inside the Supabase database, so the website itself is just HTML and JavaScript.

| Service | Why | Cost for the pilot |
| --- | --- | --- |
| **GitHub Pages** (`limelizardgames/everbound`) | Hosts the website, rebuilt automatically on every push to `main` | Free for a **public** repo. A private repo needs GitHub Pro/Team. |
| **Supabase** | Database, logins, Tavern chat, portraits | Free tier |
| Stripe *(optional)* | Online payment for sessions and store | 2.9% + 30¢ per charge |
| Custom domain *(optional, recommended before printing cards)* | QR codes encode the site address | ~$12/yr |

Your site address is **https://everbound.limelizardgames.com** (custom domain, set up in step 6). Without a custom domain it would be https://limelizardgames.github.io/everbound/.

---

## 1. Supabase (database + login)

1. Go to <https://supabase.com> → **New project**. Pick a region near your store.
2. Open the setup file on GitHub: <https://github.com/limelizardgames/everbound/blob/main/supabase/setup.sql>. Click the **Copy raw file** button (the two-squares icon at the top right of the file). Don't select the text by hand.
3. In Supabase, open **SQL Editor → New query**. Make sure the editor is completely empty, paste, make sure no text is highlighted, and click **Run**. You should see *Success. No rows returned*.
   - This creates every table, security rule and game function, and seeds the starting world: 10 locations, 5 quests, 6 upcoming sessions, the Crimson Wyrm raid at 3/5 sigils, the store, and **12 unclaimed founding guild cards**.
   - The setup runs as one transaction: if it fails, nothing is applied and you can simply run it again.
   - If you see **`type "user_role" already exists`** (or any "already exists" error), an earlier attempt left pieces behind. Run [`supabase/reset.sql`](../supabase/reset.sql) the same way (Copy raw file → empty query → Run), then run `setup.sql` again. The reset deletes all Everbound data, which is fine before launch.
4. **Authentication → URL Configuration**:
   - *Site URL*: `https://everbound.limelizardgames.com`
   - *Redirect URLs*: add `https://everbound.limelizardgames.com/**` (and `http://localhost:3000/**` for local testing)
5. **Authentication → Sign In / Providers → Email**: for quick testing, turn **Confirm email** off so testers can sign up and play immediately. Turn it back on before a public launch.
6. **Project Settings → API**: copy the **Project URL** and the **anon public** key. The anon key is designed to be public, so it's safe in a website.

> Supabase's built-in email sender is rate-limited to a few emails per hour. Before launch, add your own SMTP server (Resend, Postmark…) under **Authentication → SMTP Settings**.

## 2. GitHub Pages (website hosting)

1. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Not *Deploy from a branch*: that mode publishes the raw source code instead of the site.
2. **Settings → Secrets and variables → Actions → Variables tab → New repository variable**. These must be *Variables*, not *Secrets*. Add:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `NEXT_PUBLIC_TIMEZONE` *(optional)* | e.g. `America/New_York` (the default) |
   | `NEXT_PUBLIC_SITE_URL` *(optional)* | only if you use a custom domain, e.g. `https://everbound.limelizardgames.com` |

3. **Actions** tab → **Deploy to GitHub Pages** → **Run workflow** (it also runs on every push to `main`). After about 2 minutes the site is live at the address shown on the run.

> Never add the Supabase **service_role** key or any Stripe key to GitHub. Anything in the website build is public.

## 3. Make yourselves the Guild Masters

There is no sign-up page: every account, including yours, is created by scanning a guild card.

1. Sign in to Supabase, open **SQL Editor**, and get two card links:

   ```sql
   select card_number, 'https://everbound.limelizardgames.com/card/?t=' || token as link
   from public.guild_cards where status = 'unassigned' order by card_number limit 2;
   ```

2. Each founder opens one link (or scans that printed card) and fills in **Create your account**.
3. Back in the SQL Editor, run (with your own emails):

   ```sql
   update public.profiles set role = 'owner'
   where id = (select id from auth.users where email = 'founder-one@example.com');

   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'founder-two@example.com');
   ```

4. Refresh the site. A **GM Console** button appears. Further roles are assigned from **Command Center → Players & Moderation**.

> Need an account without a card (for example a store owner)? Set `card_required_for_signup` to `false` in `admin_settings`, create the account in **Supabase → Authentication → Add user**, then set it back to `true`.

## 4. Print and hand out guild cards

1. **Command Center → Guild Cards**: forge a batch, or use the 12 seeded founding cards.
2. Click **Print sheet**. This opens a Letter-size sheet of CR80 cards (3.375" × 2.125"). Print at **100% scale**, or save as PDF for a card printer.
3. A player scans the QR, fills in **Create your account** on the card's page, and goes straight to character creation. The card is now theirs. The same QR shows their verified public profile from then on, and it never logs anyone in.
4. If a camera won't scan, the player can type the code printed under the QR into **Guild Card** in their portal. Staff can also bind a card directly with **Assign or transfer**.
5. For a lost card or a rank upgrade, use **Replace**. The old card stops working and a new number is issued to the same adventurer, with no progress lost.

> **Decide your permanent address before printing.** QR codes encode the site URL. If you'll move to a custom domain later, set it up first (step 6) so printed cards never go stale.

## 5. Stripe (optional: online payments)

The demo works without Stripe: seats are confirmed instantly as **Pay at the store**, and GMs tick **Paid in store** on the roster. Store orders are reserved and paid at pickup.

Online payments run in two **Supabase Edge Functions** (in `supabase/functions/`), so secret keys never touch the website:

1. Install the Supabase CLI and log in: `npx supabase login`
2. Deploy both functions:

   ```bash
   npx supabase functions deploy create-checkout --project-ref YOUR-PROJECT-REF
   ```

   ```bash
   npx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref YOUR-PROJECT-REF
   ```

3. In Supabase → **Edge Functions → Secrets**, add:
   - `STRIPE_SECRET_KEY`: from Stripe → Developers → API keys. Start with the **test** key.
   - `SITE_URL`: `https://everbound.limelizardgames.com`
   - `STRIPE_WEBHOOK_SECRET`: from the next step
4. Stripe → **Developers → Webhooks → Add endpoint**: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook`, with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. **Command Center → Settings & Orders**: switch *Session payments* and/or *Store payments* to Stripe.
6. Test with card `4242 4242 4242 4242`, any future date and any CVC.

Booking places a 30-minute seat hold. Payment is confirmed **only** by the signed webhook.

## 6. Custom domain (optional)

1. At your domain's DNS provider, add a record: type **CNAME**, name **everbound**, value **limelizardgames.github.io**.
   Then in repo **Settings → Pages → Custom domain**, enter `everbound.limelizardgames.com` and wait for *DNS check successful*. Tick **Enforce HTTPS** once it's available (this can take up to an hour).
2. Set the repo variable `NEXT_PUBLIC_SITE_URL` to `https://everbound.limelizardgames.com` and re-run the workflow.
3. Update Supabase **Site URL / Redirect URLs** and the `SITE_URL` function secret to match.

## 7. Local development

```bash
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm install
npm run dev                  # http://localhost:3000
```

Database tests (needs a local Postgres 15+ and `psql`):

```bash
PGURL=postgres://postgres@localhost:5432 npm run db:test
```

After changing a migration or the seed, regenerate the one-paste file with `npm run db:bundle`.


# Operations


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
- **Rename allegiances** (name, motto, description, colour) in **Command Center → Names & Lore** (administrators). Members stay in place. To add a new faction, insert a row in the `factions` table with a `slug` and `raid_side`.
- Faction names are working names: check them in the trademark review along with "Everbound".

## Names & Lore

**Command Center → Names & Lore** (administrators) edits the allegiance names and the wording of **The Ten Oaths** (each oath and its plain-language meaning). Both show on the site immediately. *Restore original wording* puts the oaths back. The saved oaths live in `admin_settings.guild_oaths`.

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
