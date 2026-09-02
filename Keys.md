# Submission

## What was built

A multi-provider clinic appointment scheduling application:

- **Next.js 15 (App Router) + TypeScript + Tailwind**, with React Server
  Components for pages and Client Components only where interactivity requires
  it, Server Actions for all mutations, and a Route Handler for CSV export.
- **Supabase (PostgreSQL + Auth + RLS)** with `@supabase/ssr` for sessions.
- **One scheduling entity** (`appointments`) for both available slots and booked
  appointments, with database-level overlap protection.
- Immutable **audit timeline**, **supporting providers**, **visit notes**,
  server-side **search/filter/sort/pagination**, bulk **recurring availability
  generation**, daily **CSV export**, **dashboard metrics** including an
  eight-week no-show chart, and **unconfirmed alerts** with the
  dismissal/reappearance rule.

## Key design points (details in `docs/`)

1. **Writes are trusted server code, reads go through RLS.** All mutations run
   in Server Actions after explicit auth + role + ownership checks and write via
   the service-role client. RLS grants SELECT only, so the public API can never
   write — including to the audit table.
2. **Overlap protection is a Postgres EXCLUDE constraint** on a generated
   `tstzrange`, enforced atomically — no query-then-insert race, safe under
   concurrency, including bulk slot creation.
3. **Alerts are time-derived** (requested, in the future, within 24h, not
   dismissed unless within one hour when they reappear) — no background job.
4. **Search is server-side** with `pg_trgm` + `ILIKE`; no search engine needed.
5. **Constraints over application code**: slots vs appointments, cancelled
   requires a reason, duplicate supporting providers (composite PK), audit
   append-only.

## How to run

1. Supabase CLI: `npx supabase start` then `npx supabase db reset`
   (applies `supabase/migrations/001..009` + `supabase/seed.sql`).
2. `cp .env.example .env.local` and fill in the three keys.
3. `npm install && npm run dev` → http://localhost:3000

Demo logins (password `password123`): `front_desk.one@clinic.test`,
`provider.alice@clinic.test`, `provider.bob@clinic.test`,
`provider.carol@clinic.test`, `front_desk.two@clinic.test`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Integration tests (`npm run test:integration`) additionally verify the overlap
constraint, the cancelled-reason check, and RLS write protection against a live
local Supabase stack.

## Notable assumptions / trade-offs (see `docs/decisions.md`)

- Audit events are appended after each mutation (not in a DB trigger); a crash
  between the two could lose an event.
- Alert dismissal is not audited (it is UI state).
- Seed data is relative to `now()` so a current day always renders; re-run
  `supabase db reset` to refresh.
- Providers transition status only on their own appointments; front desk can
  act on any appointment.