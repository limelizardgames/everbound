# Going live: setup guide

Everbound is a **static website hosted on GitHub Pages**, backed by **Supabase**: the database, logins, realtime chat and portrait storage. Every rule (who can claim a card, book a seat, approve rewards…) is enforced inside the Supabase database, so the website itself is just HTML and JavaScript.

| Service | Why | Cost for the pilot |
| --- | --- | --- |
| **GitHub Pages** (`limelizardgames/everbound`) | Hosts the website, rebuilt automatically on every push to `main` | Free for a **public** repo. A private repo needs GitHub Pro/Team. |
| **Supabase** | Database, logins, Tavern chat, portraits | Free tier |
| Stripe *(optional)* | Online payment for sessions and store | 2.9% + 30¢ per charge |
| Custom domain *(optional, recommended before printing cards)* | QR codes encode the site address | ~$12/yr |

Your site address will be **https://limelizardgames.github.io/everbound/** unless you add a custom domain.

---

## 1. Supabase (database + login)

1. Go to <https://supabase.com> → **New project**. Pick a region near your store.
2. Open the setup file on GitHub: <https://github.com/limelizardgames/everbound/blob/main/supabase/setup.sql>. Click the **Copy raw file** button (the two-squares icon at the top right of the file). Don't select the text by hand.
3. In Supabase, open **SQL Editor → New query**. Make sure the editor is completely empty, paste, make sure no text is highlighted, and click **Run**. You should see *Success. No rows returned*.
   - This creates every table, security rule and game function, and seeds the starting world: 10 locations, 5 quests, 6 upcoming sessions, the Crimson Wyrm raid at 3/5 sigils, the store, and **12 unclaimed founding guild cards**.
   - If you get an error, run `select count(*) from pg_tables where schemaname = 'public';`. If it says **0**, nothing was applied and you can simply try again.
4. **Authentication → URL Configuration**:
   - *Site URL*: `https://limelizardgames.github.io/everbound/`
   - *Redirect URLs*: add `https://limelizardgames.github.io/everbound/**` (and `http://localhost:3000/**` for local testing)
5. **Authentication → Sign In / Providers → Email**: for quick testing, turn **Confirm email** off so testers can sign up and play immediately. Turn it back on before a public launch.
6. **Project Settings → API**: copy the **Project URL** and the **anon public** key. The anon key is designed to be public, so it's safe in a website.

> Supabase's built-in email sender is rate-limited to a few emails per hour. Before launch, add your own SMTP server (Resend, Postmark…) under **Authentication → SMTP Settings**.

## 2. GitHub Pages (website hosting)

1. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables tab → New repository variable**. Add:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `NEXT_PUBLIC_TIMEZONE` *(optional)* | e.g. `America/New_York` (the default) |
   | `NEXT_PUBLIC_SITE_URL` *(optional)* | only if you use a custom domain, e.g. `https://everbound.limelizardgames.com` |

3. **Actions** tab → **Deploy to GitHub Pages** → **Run workflow** (it also runs on every push to `main`). After about 2 minutes the site is live at the address shown on the run.

> Never add the Supabase **service_role** key or any Stripe key to GitHub. Anything in the website build is public.

## 3. Make yourselves the Guild Masters

1. Each founder signs up on the live site with **Join the Guild**.
2. In Supabase → **SQL Editor**, run this with your own emails:

   ```sql
   update public.profiles set role = 'owner'
   where id = (select id from auth.users where email = 'founder-one@example.com');

   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'founder-two@example.com');
   ```

3. Refresh the site. A **Command Center** button appears. Further roles (Game Master, Senior GM) are assigned from **Command Center → Players & Moderation**.

## 4. Print and hand out guild cards

1. **Command Center → Guild Cards**: forge a batch, or use the 12 seeded founding cards.
2. Click **Print sheet**. This opens a Letter-size sheet of CR80 cards (3.375" × 2.125"). Print at **100% scale**, or save as PDF for a card printer.
3. A player scans the QR → creates an account → taps **Bind this card** → registers a character. The card is now theirs. The same QR shows their verified public profile from then on, and it never logs anyone in.
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
   - `SITE_URL`: `https://limelizardgames.github.io/everbound`
   - `STRIPE_WEBHOOK_SECRET`: from the next step
4. Stripe → **Developers → Webhooks → Add endpoint**: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook`, with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. **Command Center → Settings & Orders**: switch *Session payments* and/or *Store payments* to Stripe.
6. Test with card `4242 4242 4242 4242`, any future date and any CVC.

Booking places a 30-minute seat hold. Payment is confirmed **only** by the signed webhook.

## 6. Custom domain (optional)

1. Repo **Settings → Pages → Custom domain**: enter e.g. `everbound.limelizardgames.com` and add the DNS record GitHub shows (a `CNAME` to `limelizardgames.github.io`). Tick **Enforce HTTPS**.
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
