# Decisions & assumptions

This file records decisions that were made during implementation and the
trade-offs behind them. Flag anything here you disagree with and we can revisit.

## 1. All writes use the service-role client (RLS is read-only)

**Decision**: Every mutation is a Server Action that authenticates, authorizes
in application code (`require-role` + `permissions` + `validators`), then
writes through the service-role client. RLS policies grant SELECT to
`authenticated` only.

**Why**: 
- The browser is not a security boundary. Since the server performs explicit
  authorization anyway, RLS write policies would only duplicate those rules in
  SQL (a maintenance risk) or introduce a security hole.
- With no write policies, a client manipulating a request cannot write to *any*
  table, including `appointment_audit_events` — audit history is unforgeable.
- The alternative (writing with the user's session so RLS enforces writes)
  would require an INSERT policy on the audit table, which any authenticated
  user could abuse.

**Trade-off**: The correctness of writes depends on the application-layer
authorization code (mitigated by review + tests). Reads still flow through RLS.

## 2. Overlap protection is a Postgres EXCLUDE constraint

**Decision**: `EXCLUDE USING gist (provider_id WITH =, service_range WITH &&)`
on a generated `tstzrange`, restricted to active, non-archived rows.

**Why**: "Query existing → insert if none" is racy. An exclusion constraint is
checked atomically by PostgreSQL, including within one multi-row INSERT, so two
concurrent overlapping inserts cannot both succeed. No locks or retries needed.

**Note**: `btree_gist` is required for `provider_id WITH =` on `uuid`.

## 3. Patient name search uses pg_trgm + ILIKE

**Why**: Clinic names need substring matching ("smith" → "Sarah Smithson"),
which trigram GIN indexes support well and which plain FTS (`to_tsvector`) does
not. No search engine is warranted at this data size.

## 4. Audit inserts are not transactional with the mutation

**Decision**: A mutation runs, then the audit event is appended in a second
statement via the admin client.

**Why**: `supabase-js` has no multi-statement transactions; keeping audit in one
readable place (`lib/audit/events.ts`) beats a trigger-based design that would
make audit implicit ("magic") and complicate actor attribution (writes run as
service role, so `auth.uid()` is unavailable in triggers).

**Trade-off**: A crash between the two calls could lose an event. The DB
trigger alternative (stronger atomicity, weaker attribution) is documented here
if you want it later.

## 5. Alert dismissal is a time-derived rule, not a background job

**Decision**: `lib/alerts/queries.ts` derives the alert from the row: status
`requested`, in the future, within 24h, and not dismissed — unless within 1 hour
of start, when it reappears regardless of dismissal. `alert_dismissed_at/by`
are stored on the appointment for auditability.

**Why**: Matches the spec ("time-derived, not background job") and needs no
cron/scheduler.

## 6. Dismissing an alert is not audited

Alert dismissal is UI state, not a lifecycle event; the audit event vocabulary
has no slot for it. If you want it audited, we add a `metadata`-carrying event.

## 7. A provider may only transition their own appointments

Status transitions (confirm/check-in/complete/no-show) require front-desk role
or ownership (`provider_id = user`). Supporting providers write notes but do
not run status transitions. Front desk can do anything on any appointment.

## 8. Assumptions

- **Email confirmation**: seeded users are pre-confirmed (`email_confirmed_at`
  set). Self sign-up is not part of the demo; if enabled, new users get
  `front_desk` by default via the trigger and the `/auth/confirm` route handles
  the confirmation link.
- **Local timezone**: `scheduled_start` is `timestamptz`; the UI interprets a
  calendar day using the server's local timezone for schedule boundaries.
- **`profiles` reads are open to all authenticated staff** (shared clinic
  schedule). Restrict with RLS policies later if you want data isolation.
- **Archive** is the mechanism for removing available slots (soft delete) so
  history is preserved; appointments themselves are never hard-deleted.
- **The seed is time-relative**: today's rows are placed relative to `now()`
  when `seed.sql` runs, so the demo always shows a realistic current day.
  Re-run `supabase db reset` to refresh it.
- **Integration tests** require a running local Supabase; they self-skip
  otherwise (see `tests/integration/schema.test.ts`).

## 9. Non-goals / deferred

- Notifications to patients/providers (email/SMS).
- Recurring-appointment *templates* (bulk slot generation exists; templates can
  be built on top of `lib/availability/generation.ts`).
- Hard deletion / GDPR-style anonymization flows.
- Multi-clinic tenancy (single clinic assumed).