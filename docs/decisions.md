# Decisions

## Decision 1: Overlap and Double-Booking Prevention

- **Chose:** A PostgreSQL GiST exclusion constraint (`EXCLUDE USING gist (provider_id WITH =, service_range WITH &&)`) on a generated stored `tstzrange` column (`[start, start + duration)`).
- **Rejected:** Application-level "check-then-insert" logic (`SELECT count(*) FROM appointments WHERE ...` followed by an `INSERT` if clear).
- **Why:** In a busy clinic where multiple receptionists take calls at the same time, application-layer checks suffer from classic Time-of-Check to Time-of-Use (TOCTOU) race conditions. If two staff members click "Book" for Dr. Alice at the same second, both `SELECT` queries see 0 conflicts, and both `INSERT` queries succeed—leading to an embarrassing double-booked patient. The PostgreSQL GiST exclusion constraint locks the physical index range at transaction commit time. If two overlapping inserts occur simultaneously, the database atomically accepts the first and rejects the second with a deterministic constraint violation.

## Decision 2: Scheduling Data Model (Single Table vs. Separate Tables)

- **Chose:** A single polymorphic `appointments` table representing both unbooked availability slots (`patient_id IS NULL AND status IS NULL`) and booked appointments (`patient_id IS NOT NULL AND status IS NOT NULL`).
- **Rejected:** Creating separate tables for `availability_slots` and `booked_appointments`.
- **Why:** With two separate tables, booking a slot becomes a risky two-phase operation: deleting the slot while inserting a new appointment row. If the server hiccups midway or two requests race, you risk orphaned records or double-bookings across tables. By using a single table, booking an open slot is a simple, atomic `UPDATE` statement guarded by the same GiST exclusion constraint. Unbooked slots can also be soft-archived (`archived_at`) without destroying past historical visits.

## Decision 3: Write Authorization & RLS Architecture

- **Chose:** Executing all mutations strictly through Next.js Server Actions using a trusted Supabase service-role client, while locking down Supabase Row-Level Security (RLS) to `SELECT`-only for authenticated users.
- **Rejected:** Allowing the client browser to write directly to Supabase tables using user-scoped session tokens with granular `INSERT`/`UPDATE` RLS policies.
- **Why:** The browser is never a security boundary. If we opened `INSERT`/`UPDATE` policies in Supabase RLS, any client with an auth token could execute direct REST calls against the database. Most critically, Goal 9 requires an append-only audit trail: if clients could insert rows directly into `appointment_audit_events`, malicious or buggy clients could forge audit logs. By making RLS read-only and routing all mutations through Server Actions, the server performs explicit role checks (`requireRole`), validates Zod schemas, and appends audit logs before writing.
- **Later reversed:** Early in Session 1, I originally started with standard Supabase client-side mutations backed by table RLS policies (the default tutorial pattern). I reversed this decision when implementing the legal audit trail in Goal 9: there was no clean SQL policy that allowed users to log legitimate audit records without also opening a loophole where they could forge or tamper with audit entries. Moving all writes into trusted Server Actions solved audit immutability and authorization in one clean architecture.

## Decision 4: Urgent Unconfirmed Alert Calculation

- **Chose:** Deriving alerts dynamically on-the-fly during query time (`lib/alerts/queries.ts`) based on appointment start times, status (`requested`), and dismissal timestamps.
- **Rejected:** Running a background cron worker / daemon (like `pg_cron`, Celery, or a Redis job queue) to periodically flag rows and write them to an `alerts` table.
- **Why:** Background cron workers add operational fragility—they can crash, run out of memory, or introduce polling latency (e.g. an alert delayed by 10 minutes because the worker only polls every quarter-hour). Since whether an appointment is "urgent" is a pure mathematical calculation (`scheduled_start <= now() + 24h` and `status = 'requested'`), calculating it dynamically in SQL backed by our `(status, scheduled_start)` index guarantees 100% real-time accuracy with zero background infrastructure overhead.

## Decision 5: Patient Name Search Strategy

- **Chose:** PostgreSQL trigram indexing via the `pg_trgm` extension with `ILIKE '%term%'` backed by GIN indexes on `patients(full_name)`.
- **Rejected:** PostgreSQL Full-Text Search (`to_tsvector` / `to_tsquery`) or standing up a separate external search cluster (Elasticsearch / Meilisearch).
- **Why:** Clinic receptionists frequently search for patients using partial names, nicknames, or misspellings (e.g., typing "smi" to find "Sarah Smithson" or "chen" to find "James Chen"). Standard Postgres Full-Text Search is designed for whole-word dictionary matching and struggles with substring searches. Conversely, spinning up Elasticsearch for a single clinic with under 100,000 patients is massive overkill. `pg_trgm` GIN indexes deliver sub-10ms substring searches natively inside PostgreSQL with zero extra operational baggage.

## Decision 6: Client Route Transitions & Performance (Sub-80ms Navigation)

- **Chose:** URL-driven server pagination (10 items/page), React `cache()` for user session lookup deduplication, and Next.js `<Link prefetch={true} />`.
- **Rejected:** Client-side SPA state stores (like Redux or Zustand) downloading full clinic history JSON payloads up front and filtering locally in the browser.
- **Why:** Downloading thousands of clinic visits on initial page load causes noticeable white-screen lag and burns mobile device memory. Capping payloads to 10 records per page keeps JSON responses under 10KB. Wrapping auth lookups in React's `cache()` function ensures layout and page components share a single session check per render cycle, enabling instant, sub-80ms tab switching across Schedule, Appointments, Patients, and Alerts.