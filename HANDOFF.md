# Everbound — Handoff Notes

Shared notes for anyone (Claude, Codex/OpenAI, or a person) picking up work in this repo.
**Update the log at the bottom whenever you finish a task.**

## What's where

| Path | What it is |
|---|---|
| `src/` | Website (Next.js 15 static export, deployed to GitHub Pages) |
| `supabase/migrations/` | Database schema; `supabase/setup.sql` is the bundled version (`node scripts/bundle-sql.mjs`) |
| `supabase/tests/flow_test.sql` | Database flow tests (run against a local Postgres) |
| `presentation/docs/` | Working design docs (Markdown/JSON): progression compendium v1.3, racial trees v1.1, synergies v1.1, Core Rules v0.1 |
| `presentation/pdf/` | The PDF set EB-00 to EB-12; each one is marked Draft or Approved |
| `presentation/pdf_src/` | Markdown/HTML sources for the PDFs, plus `manifest.json` |
| `presentation/art/` | Lineage art sheets (canon art style) |
| `presentation/Everbound-Overview.pptx` | 24-slide overview deck |
| `presentation/tools/` | Build scripts for the deck (pptxgenjs), PDFs (pandoc + Playwright) and Core Rules doc. **Paths inside are hard-coded to the old build machine; edit them before running.** |

Whiteboard (workshop board): https://claude.ai/artifact/FAtTWH5NSa6usfyhfpG4kp

## Rules for everyone

- **Never commit secrets.** No Supabase service_role key, no Stripe secret keys, no `.env` files. The website build only uses the public anon key.
- Don't create test accounts or claim real cards in the live database.
- `EB-12 Decisions Log` is the source of truth for what's been decided. Don't change anything marked Approved without the owner's go-ahead.
- Work on a branch, then pull before you push, so two agents don't overwrite each other.

## Open decisions (as of 2026-11-24)

- Rename the **Ashen Covenant** faction (keep it tied to the actual races).
- Guild rank C is titled **"Vanguard"**, which is also a class name. Ideas: Warden, Sentinel.
- Reword **Oath I** for PvP. Suggestion: "Raise no blade against a guildmate outside the field of honour."
- Core Rules v0.1: which dice to use, 6 vs 4 attributes, how death works, when HP resets, and the starting numbers.
- Guild Trials open questions (see EB-06).
- Business: seat price, playtest date, legal documents.
- Website: update classes, races and lineages once the rules are final.

## Log

- 2026-11-24 — Claude (cloud session): added the presentation files and build tools to the repo; created this file. Board cleaned to about 200 elements; detail lives in the PDFs.
