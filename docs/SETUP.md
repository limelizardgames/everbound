# Going live: setup guide

You need three free accounts for a working demo, plus Stripe if you want online payments. The whole setup takes about 30 minutes.

| Service | Why | Cost for the pilot |
| --- | --- | --- |
| **GitHub** (`limelizardgames/everbound`) | Holds the code; Vercel deploys from it | Free |
| **Supabase** | Database, logins, realtime Tavern chat, portrait storage | Free tier |
| **Vercel** | Hosts the website | Free (Hobby) or $20/mo (Pro, required for commercial use) |
| Stripe *(optional)* | Session admission and store payments | 2.9% + 30¢ per charge |
| Your domain *(optional, recommended before printing cards)* | QR codes encode the site URL | ~$12/yr |

---

## 1. Supabase (database + login)

1. Go to <https://supabase.com> → **New project**. Pick a region near your store and save the database password.
2. Open **SQL Editor** → **New query**, paste the whole of [`supabase/setup.sql`](../supabase/setup.sql), and click **Run**. It creates every table, security policy and game rule, and seeds the starting world: 10 locations, 5 quests, 6 scheduled sessions, the Crimson Wyrm raid at 3/5 sigils, the store, and **12 unclaimed founding guild cards**.
3. **Authentication → URL Configuration**:
   - *Site URL*: your Vercel URL (from step 2), for example `https://everbound.vercel.app`
   - *Redirect URLs*: add `https://YOUR-SITE/auth/callback` and `http://localhost:3000/auth/callback`
4. **Authentication → Providers → Email**. For quick testing you can turn **Confirm email** off, so testers sign up and play immediately. Turn it back on before a public launch.
5. **Project Settings → API**: copy the **Project URL**, the **anon public** key and the **service_role** key (keep that one secret).

> Supabase's built-in email sender is rate-limited to a few emails per hour. Before launch, add your own SMTP server (Resend, Postmark, SendGrid…) under **Authentication → SMTP Settings**.

## 2. Vercel (website hosting)

1. Go to <https://vercel.com/new> and import `limelizardgames/everbound`.
2. Add these **Environment Variables** (see `.env.example`):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-final-domain` (QR codes use this) |
   | `NEXT_PUBLIC_TIMEZONE` | e.g. `America/New_York` |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (needed only with Stripe) |

3. Click **Deploy**. Then go back to Supabase step 3 and paste the real URL.

## 3. Make yourselves the Guild Masters

1. Each founder signs up on the live site at **Join the Guild**.
2. In Supabase → **SQL Editor**, run (with your own emails):

   ```sql
   update public.profiles set role = 'owner'
   where id = (select id from auth.users where email = 'founder-one@example.com');

   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'founder-two@example.com');
   ```

3. Sign out and back in. A **Command Center** button appears. Further roles (Game Master, Senior GM) can be assigned from **Command Center → Players & Moderation**.

## 4. Print and hand out guild cards

1. **Command Center → Guild Cards**: forge a batch (or use the 12 seeded founding cards).
2. Click **Print sheet**. This opens a Letter-size sheet of CR80 cards (3.375" × 2.125"). Print at **100% scale**, or send the PDF to a card printer.
3. A player scans the QR → creates an account → taps **Bind this card** → registers a character. The card is now theirs, and the same QR shows their verified public profile from then on.
4. If a camera won't scan, the player can type the code printed under the QR into **Guild Card** in their portal. Staff can also bind a card directly with **Assign or transfer**.
5. Lost card or rank upgrade: **Replace**. The old card stops working and a new card number is issued to the same adventurer, with no progress lost.

> **Set `NEXT_PUBLIC_SITE_URL` to your permanent domain before printing.** QR codes encode that URL, so cards printed while you're on a temporary `vercel.app` address will point there forever.

## 5. Stripe (optional: online payments)

The demo works without Stripe: seats are confirmed instantly and marked **Pay at the store**, and GMs tick **Paid in store** on the roster.

To take payments online:

1. In the Stripe dashboard (start in **Test mode**), go to **Developers → API keys** and copy the secret key into `STRIPE_SECRET_KEY` on Vercel.
2. **Developers → Webhooks → Add endpoint**: `https://YOUR-SITE/api/stripe/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set, then redeploy.
4. **Command Center → Settings & Orders → Session payments** → *Stripe Checkout required*.
5. Test with card `4242 4242 4242 4242`, any future date, any CVC.

Booking then places a 30-minute seat hold. Payment is confirmed **only** by the signed webhook, never by the browser.

## 6. Local development

```bash
cp .env.example .env.local   # fill in your Supabase values
npm install
npm run dev                  # http://localhost:3000
```

Database tests (needs a local Postgres 15+ and `psql`):

```bash
PGURL=postgres://postgres@localhost:5432 npm run db:test
```

After changing a migration or the seed, regenerate the one-paste file with `npm run db:bundle`.
