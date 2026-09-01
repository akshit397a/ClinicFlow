# Architecture

## Overview

A multi-provider clinic appointment scheduler. Next.js 15 (App Router) is the
browser application **and** the server layer. Supabase provides PostgreSQL,
Auth, and Row Level Security. There is no separate Express/Nest backend.

```
Browser (React)  -- Server Actions / Route Handlers -->  Next.js server layer
                                                              |
                                            (auth, role, ownership checks)
                                                              |
                                                 Supabase (Postgres + Auth)
```

## Data flow

- **Reads** (lists, detail pages, dashboard, alerts): rendered by React Server
  Components that call query functions. Queries use a session-bound Supabase
  client (`lib/supabase/server.ts`) whose identity is the signed-in user's
  cookie session, so **RLS applies to every read**.
- **Writes** (book, confirm, cancel, notes, availability, patients): invoked
  through **Server Actions** (`lib/*/actions.ts`). Each action:
  1. Authenticates via `requireAuth()` (reads the Supabase session).
  2. Authorizes via `require-role` / `permissions` / `validators` (role + row
     ownership + business state).
  3. Mutates the database through the **service-role client**
     (`lib/supabase/admin.ts`), which bypasses RLS.
  4. Appends an immutable audit event (`lib/audit/events.ts`).
- **HTTP-oriented features** (CSV export) use Route Handlers
  (`app/api/schedules/csv/route.ts`), which also run `requireAuth()`.

### Why writes use the service role

The browser must never be a security boundary. Because Server Actions already
perform identity + role + ownership checks, the database write is executed by
**trusted server-side code**. This has a decisive security property: the public
API (anon key) has **no write policies at all**, so a client cannot mutate or
forge anything directly — not even the audit history. See `docs/decisions.md`.

## Folder map

```
app/
  (auth)/login        Sign-in screen
  (auth)/layout       Redirects to dashboard when signed in
  (dashboard)         Authenticated area (dashboard, appointments, schedule,
                      patients, providers, alerts)
  api/schedules/csv   CSV export route handler
  auth/confirm        Email/OTP link exchange
lib/
  supabase/           client (browser), server (session), proxy (middleware),
                      admin (service role)
  auth/               get-current-user, require-auth, require-role, actions
  appointments/       status flow, permissions, validators, queries, actions
  availability/       slot generation (pure), validators, queries, actions
  providers, patients, dashboard, alerts, audit, csv
  db/types.ts         hand-written types mirroring the schema
  validation/         zod schemas (single source for input validation)
  utils/              dates, pagination, errors, results
supabase/
  migrations/         001..009 ordered SQL migrations
  seed.sql            development/demo data
components/           UI primitives + feature components (client where needed)
tests/unit            vitest unit tests
tests/integration     schema/constraint tests (needs local Supabase)
```

## Concurrency & integrity at the database

- **Overlapping slots**: `appointments` has a generated `service_range
  tstzrange` column and an **exclusion constraint**
  (`EXCLUDE USING gist (provider_id WITH =, service_range WITH &&)`) restricted
  to active rows (available slots, requested/confirmed/checked_in, not
  archived). PostgreSQL enforces it atomically — two concurrent overlapping
  inserts cannot both succeed, and a single multi-row insert is checked
  against itself. There is no query-then-insert race.
- **Cancelled requires a reason**: CHECK constraint.
- **Slots vs appointments**: CHECK constraint — a row is either a slot
  (patient NULL, status NULL) or a booked appointment (both set).
- **Duplicate supporting providers**: composite primary key.

## Auth

Supabase Auth (email/password). Passwords live only in `auth.users`, never in
application tables. A trigger (`handle_new_user`) creates a matching row in
`profiles` on sign-up; the role defaults to `front_desk` so a stray sign-up
cannot self-grant provider privileges. The middleware
(`middleware.ts` + `lib/supabase/proxy.ts`) refreshes sessions on each request.

## Roles

- `front_desk`: manages patients, availability (any provider), books slots,
  runs status transitions on any appointment, assigns supporting providers,
  dismisses alerts, views everything.
- `provider`: manages their **own** availability, runs status transitions on
  their own appointments, writes visit notes for appointments they are primary
  or supporting provider on.

Permissions are implemented once in `lib/appointments/permissions.ts` and
enforced in every Server Action; the UI merely hides what the current user
cannot do (UX only).