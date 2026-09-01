# Plan

Time-boxed build of the clinic scheduling app. Every item maps to code you can
point at; the "why" is in `docs/decisions.md` and `docs/architecture.md`.

## 1. Foundation
- Scaffold Next.js 15 (App Router) + TypeScript + Tailwind.
- Dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `date-fns`,
  `vitest`.

## 2. Database (`supabase/`)
- Ordered migrations `001..009`:
  1. extensions (pgcrypto, btree_gist, pg_trgm)
  2. profiles (+ `set_updated_at` trigger, `handle_new_user` trigger)
  3. patients
  4. appointments (slot-or-appointment CHECK, cancelled-reason CHECK, generated
     `service_range`, `no_overlap` EXCLUDE constraint, updated_at trigger)
  5. appointment_supporting_providers (composite PK)
  6. visit_notes
  7. appointment_audit_events (append-only)
  8. indexes (including pg_trgm GIN for name search)
  9. RLS (SELECT-only policies)
- `seed.sql`: 2 front-desk + 3 provider users, 8 patients, today's schedule per
  provider, future slots, alert demos (suppressed + reappearing), 8 weeks of
  completed/no-show history, cancellations, supporting providers, notes,
  audit history.
- `config.toml` so `supabase db reset` applies migrations + seed.

## 3. Server library (`lib/`)
- Supabase clients: browser, server (session), proxy (middleware), admin
  (service role).
- Auth: `get-current-user`, `require-auth`, `require-role`, sign in/out actions.
- Appointments: status flow table, permission matrix, validators, server-side
  query (search/filter/sort/pagination), Server Actions (book, transition,
  cancel, dismiss alert, archive slot, notes, supporting providers) each with
  audit recording.
- Availability: pure slot generation, bulk-create action (concurrency-safe via
  the EXCLUDE constraint), queries.
- Patients: list (search + pagination) + create/update actions.
- Dashboard: today-by-status, upcoming, alert count, 8-week no-show series.
- Alerts: time-derived alert rule (dismissal + one-hour reappearance).
- Audit: event append helpers + read-only timeline query.
- CSV: pure schedule→CSV builder.
- Validation: one set of zod schemas.

## 4. UI (`app/` + `components/`)
- Auth layout + login (client form).
- Dashboard layout with role-aware nav and sign-out.
- Dashboard page (metrics + no-show chart).
- Appointments list (server-side filters + pagination) and detail page
  (actions, care team, notes, immutable timeline).
- Schedule page (per-provider day view, CSV link, bulk availability form).
- Patients list + detail.
- Providers list.
- Alerts page (derived alert list + dismiss).
- CSV route handler, auth confirm route handler.

## 5. Tests
- Unit (vitest): status transitions, alert rule, slot generation, permissions,
  validators, pagination, CSV.
- Integration (skipped without a live stack): overlap constraint, cancelled-
  requires-reason, audit write protection.

## 6. Docs
- architecture.md, schema.md, decisions.md, ai-prompts.md, README, SUBMISSION,
  .env.example.

## Done when
- `npm run lint`, `npm run typecheck`, `npm test` pass.
- `npm run build` succeeds.
- With a local Supabase stack: `supabase db reset` applies migrations + seed,
  `npm run dev` allows signing in as front desk or provider and exercising the
  full workflow.