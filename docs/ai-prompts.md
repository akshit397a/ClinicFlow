# AI prompts for working in this codebase

Reusable prompts that describe the architecture's rules so an AI assistant can
make safe, consistent changes. Copy the relevant one into your session.

## Universal context block

```
Context: Next.js 15 App Router + TypeScript + Tailwind. Supabase (Postgres)
with @supabase/ssr. Folder layout and rationale in docs/architecture.md,
schema in docs/schema.md, trade-offs in docs/decisions.md.

Rules:
- Reads go through the authenticated session client (lib/supabase/server.ts),
  which enforces RLS (SELECT-only).
- Writes happen ONLY in Server Actions through lib/supabase/admin.ts (service
  role) AFTER explicit auth + role + ownership checks
  (lib/auth/*, lib/appointments/permissions.ts, lib/appointments/validators.ts).
- Every business mutation appends an immutable audit event via
  lib/audit/events.ts. Never delete or update appointment_audit_events.
- Overlapping availability is prevented by a Postgres EXCLUDE constraint on
  appointments.service_range; do not implement check-then-insert for it.
- Validate all external input with zod (lib/validation/schemas.ts). The browser
  is never a security boundary.
- Do not add abstractions that are not used. Keep components small.
```

## Adding a new appointment action

```
Add a Server Action in lib/appointments/actions.ts named
<verb>AppointmentAction that:
1. calls requireAuth()
2. parses input with the relevant zod schema
3. fetches the appointment via getAppointmentForAction
4. checks permissions via lib/appointments/permissions.ts and business state
   via lib/appointments/validators.ts
5. mutates through the admin client, mapping errors with toErrorMessage
6. appends the matching audit event from lib/audit/events.ts
7. calls refreshRelevantPaths(id) and returns a typed result.
Add unit tests in tests/unit for any new pure logic (status/permissions/rule).
```

## Adding a query

```
Add the query to lib/<domain>/queries.ts using the session client
(createServerSupabaseClient) so RLS applies. Keep search/filter/sort/
pagination server-side. Name the function with a get- prefix and return
strongly typed rows (cast at the boundary from lib/db/types.ts).
```

## Adding a page

```
Create the page under app/(dashboard)/<route>/page.tsx as a Server Component
that calls requireAuth(), awaits its Promise<searchParams>, and renders presentational
server components. Use client components ONLY where interactivity requires it,
and pass only serializable props. Never embed authorization decisions only in
the UI - the server actions must enforce them.
```

## Writing/extending SQL

```
Work in supabase/migrations/ with a numbered 0XX_<name>.sql file. Follow the
existing conventions: updated_at via public.set_updated_at() triggers, FKs with
explicit delete rules (restrict for history-critical columns), CHECKs for
invariants, and prefer database constraints over application code for
concurrency-sensitive rules. Never add a column that contradicts the
slot-vs-appointment or overlap rules (docs/schema.md).
```

## Verifying before you finish

```
Run, in order: npm run lint, npm run typecheck, npm test, npm run build.
If you changed SQL, also verify against a local Supabase stack:
npx supabase start; npx supabase db reset; then run the integration tests
(SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_KEY / SUPABASE_TEST_ANON_KEY).
```