# EVERBOUND — The Living Adventurers Guild

A mobile-first fantasy guild platform for a persistent, real-world tabletop adventure. Players carry a physical QR guild card, register an adventurer, book hosted sessions at a partner game store, earn XP, gold and renown, and watch their choices reshape a shared world.

A Lime Lizard Games concept.

**To get a live demo running, see [docs/SETUP.md](docs/SETUP.md)** (Supabase + GitHub Pages, about 30 minutes; Stripe optional).

Live site: https://everbound.limelizardgames.com

## What's in the pilot ("Founding Guild")

| Area | Pages |
| --- | --- |
| Public site | Home, How It Works, Explore the World (map), Quest Board + detail, Events Calendar, Everbound Chronicle, Raid Center, Hall of Legends, Guild Store (Supply Shop + Arcane Exchange), Auction Hall, Join the Guild |
| QR guild cards | `/card/?t=<token>`: single-use claim for unclaimed cards, verified public profile for claimed ones. Never logs anyone in. |
| Adventurer portal | Status dashboard, character creation and sheet (portrait upload), guild card, inventory and ledger, journal and quest archive, bookings (pay/cancel/waitlist), Guild Tavern realtime chat, achievements, notices, settings, orders |
| GM Command Center | Dashboard, Session Manager (roster, live HP, notes, rewards → approval), Quest Creator (player-facing + GM-only sections), Guild Cards (forge, print sheet, assign, replace), World Editor (locations, flags, Chronicle, conflict review), Raid Controller, Players & Moderation, Audit Log, Settings & Orders |

## Stack

Next.js 15 static export · TypeScript · Tailwind · Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) · Stripe Checkout · **GitHub Pages** (deployed by `.github/workflows/deploy.yml`).

The website is plain static files. The browser talks to Supabase with the public anon key and the signed-in user's session; every permission is enforced in the database. The only server code is two optional Supabase Edge Functions for Stripe.

## Architecture in brief

- **All rules are enforced in Postgres.** Every table has row-level security. Privileged operations (claim card, reserve seat, approve rewards, unlock raids, buy with gold) are `SECURITY DEFINER` functions that check the caller's role. The website cannot grant anything the database would refuse.
- **Accounts ≠ characters.** One active character per account for now; the schema supports more.
- **Immutable ledgers** for XP, gold, renown and inventory. Totals are computed views. Corrections are new entries.
- **Quest templates ≠ sessions.** Rewards attach to a session with idempotency keys, so a template run ten times never double-pays and a repeated quest doesn't count as a new discovery.
- **World state** uses additive flag deltas (two tables can't overwrite each other) and conflict-aware location changes.
- **Raid engine**: a trigger evaluates raid conditions whenever a world flag changes (`DORMANT → … → ARCHIVED`), with pause and admin override.
- **Configurable rules**: species, classes, attributes and level curve live in a versioned `rule_sets` row. Swap in your chosen ruleset without code changes.
- **Payments** are confirmed only by a signature-verified Stripe webhook (Supabase Edge Function). Without Stripe, seats are confirmed as "pay at the store".

```
supabase/
  migrations/      schema, logic + RLS, storage
  functions/       Stripe Edge Functions (create-checkout, stripe-webhook)
  seed.sql         fictional starting world
  setup.sql        generated one-paste bundle (npm run db:bundle)
  tests/           end-to-end SQL tests of the acceptance criteria
src/
  app/(site)/      public site, /portal, /gm (all static pages)
  app/print/cards  printable CR80 card sheet
  lib/actions.ts   every mutation (calls Supabase; the database decides)
  lib/             Supabase client, signed-in user context, queries, QR
  components/
.github/workflows/ GitHub Pages deploy
docs/              SETUP.md, OPERATIONS.md
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Static build into `out/` |
| `npm run lint` / `npm run typecheck` | Static checks |
| `npm run db:bundle` | Rebuild `supabase/setup.sql` |
| `npm run db:test` | Run the SQL acceptance tests against a local Postgres (`PGURL=…`) |

## Decisions still needed before public launch

From §21 of the brief: the canonical rules system (the seeded "Everbound Starter Rules" are placeholders), minimum age and safeguards (signup currently requires an 18+/guardian attestation), privacy policy and refund terms, store partner terms, and the physical card production workflow.
