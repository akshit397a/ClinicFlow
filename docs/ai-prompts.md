# AI Prompts & Engineering Log

The prompts actually used during development, presented in progressive chronological order matching the full-stack build sequence of **ClinicFlow**. For each milestone: what was asked, what the AI generated, and the critical architectural corrections made to ensure clinical data integrity, server-side security, and sub-80ms performance.

---

## Step 1: Project Scaffolding & Architecture Blueprint

### Prompt
> "I'm building a clinic appointment scheduling system (ClinicFlow) with Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, and Supabase PostgreSQL. Front-desk staff need operational control across doctors (reassigning, slot creation, cancellations), while providers must have scoped views of their own schedule. How should I architect the directory structure, server/client boundaries, and data access layer?"

### What you got
The AI recommended a heavy Single-Page Application (SPA) architecture: installing Prisma Client on the browser client, pulling in tRPC, installing TanStack Query, keeping client-side scheduling state in a global Zustand store, and enforcing role permissions via `useEffect()` redirects on the client.

### What you corrected
I completely rejected the client-side SPA setup. The browser is never a security boundary; client-side route guards in `useEffect()` cause visible layout flashes and can be bypassed by inspecting network requests. Instead, I established a clean React Server Components-first architecture:
- Authentication and role checks (`front_desk` vs `provider`) are enforced strictly on the server in Server Components and Server Actions via `requireAuth()` and `requireRole()`.
- Data fetching runs directly on the server with zero client JavaScript waterfalls.
- All state mutations are handled by Next.js Server Actions using the trusted service-role client, automatically recording immutable audit events in PostgreSQL.
- Client components are strictly isolated to leaf interactive elements (e.g. modals, drawers, and chart view toggles).

---

## Step 2: Concurrency-Safe Schema & GiST Overlap Constraints (Goal 2)

### Prompt
> "I'm designing a clinic scheduler where `appointments` holds both open availability slots and booked visits. How can I write a PostgreSQL GiST exclusion constraint on a `tstzrange` column so doctors can't be double-booked, while making sure cancelled or archived slots don't block the time?"

### What you got
The AI gave me a working `tstzrange` generated column and an `EXCLUDE USING gist (provider_id WITH =, service_range WITH &&)` block. In the `WHERE` filter, it tacked on `WHERE status != 'cancelled'`.

### What you corrected
The generated SQL had two major gotchas:
1. **Missing Operator Class:** Postgres threw an immediate error on `provider_id WITH =` because native GiST doesn't support equality checks on UUIDs out of the box. I had to enable the `btree_gist` extension in migration `001_extensions.sql` to provide the missing operator class.
2. **The `NULL` Status Bug:** In our unified table, open availability slots have `status IS NULL`. Because SQL evaluates `NULL != 'cancelled'` as unknown/false, the AI's filter completely excluded open slots from overlap checks! Anyone could have created overlapping slots for the same doctor. I rewrote the filter to:
   ```sql
   WHERE (
     archived_at IS NULL
     AND (
       patient_id IS NULL
       OR status IN ('requested', 'confirmed', 'checked_in')
     )
   )
   ```
   This locked down open slots, while allowing finished, cancelled, or no-show visits to cleanly release the doctor's calendar.

---

## Step 3: Lifecycle State Machine & Server-Side RBAC (Goals 1 & 4)

### Prompt
> "Implement the appointment lifecycle state machine: Requested -> Confirmed -> Checked In -> Completed. No-Show can only happen from Confirmed and only after the scheduled time has passed. Cancellation is only allowed before check-in and must require a non-empty reason string. Illegal transitions must be rejected with an explanation. Front desk can reassign providers, but providers cannot."

### What you got
The AI wrote transition logic directly inside React component event handlers and allowed anyone to set `status = 'cancelled'` with an optional reason. For No-Show, it checked `new Date() > appointment.scheduled_start` inside browser JavaScript.

### What you corrected
Client-side validation is trivial to manipulate or bypass. I moved the entire state machine into a pure domain function `validateTransition()` in `lib/appointments/status.ts` and enforced it inside trusted Server Actions:
- **Server Time Verification:** Enforced that No-Show evaluates against server time (`Date.now() > appointmentStart.getTime()`).
- **Cancellation Reason Guard:** Required cancellation reasons to be non-empty strings (min 3 characters) and blocked cancellation once status is `checked_in` or `completed`.
- **Server-Side Role Guard:** Added strict server-side role check: `canReassignProvider(user.profile)` throws a 403 Forbidden error if a provider attempts to reassign an appointment away from themselves.

---

## Step 4: Care Team Collaboration & Author-Locked Notes (Goals 3 & 5)

### Prompt
> "We need to support multiple supporting providers per appointment (Care Team) and visit notes. A visit note belongs to one appointment and can only be edited by the provider who wrote it. How should I model the tables and enforce note ownership?"

### What you got
The AI suggested storing supporting providers as a simple array column `supporting_provider_ids text[]` on `appointments`, and suggested an RLS policy for visit notes that allowed any authenticated user to insert, while checking `author_id == auth.uid()` on update.

### What you corrected
1. **Relational Normalization:** Array columns prevent foreign key cascade integrity and complicate join queries. I created a dedicated join table `appointment_supporting_providers` with composite primary key `(appointment_id, provider_id)` and foreign keys to `profiles`.
2. **Note Author Lockdown:** The AI forgot to block front-desk staff from adding clinical encounter notes. I added a server-side permission check `canAddNote()` ensuring only the assigned primary provider or an assigned supporting provider can write notes, and `canEditNote()` ensuring that only the specific doctor who authored the note can modify its text. Front-desk staff are restricted to scheduling operations.

---

## Step 5: Bulk Availability Generation & CSV Export (Goal 7)

### Prompt
> "Write a TypeScript function to generate bulk availability slots across date ranges (e.g. Mon/Wed/Fri from 9am to 5pm, 30m slots). It must detect collisions with existing appointments and report both created and skipped counts. Also provide a route handler to export a single day schedule as CSV."

### What you got
The AI wrote an inefficient loop that executed an `INSERT` statement for every single slot inside a `try/catch` block, catching database unique constraint errors to count skipped slots. For CSV export, it joined raw strings with `.join(',')` without escaping quotes or commas.

### What you corrected
1. **N+1 Database Saturation:** Firing hundreds of individual `INSERT` queries over network roundtrips caused connection pool exhaustion. I refactored `generateAvailabilitySlots` in `lib/availability/generation.ts` into a pure algorithm: it queries the provider's active bookings for the entire date range in a single query, checks collisions in memory using interval arithmetic, filters out colliding slots, and bulk inserts the valid slots in a single batch.
2. **RFC-4180 CSV Escaping:** Raw comma-joining broke immediately when a patient name had a comma (e.g. `"Doe, Jr., Johnny"`). I added an `escapeCsvField` utility that properly wraps fields in quotes and doubles inner quotes according to RFC-4180 standards.

---

## Step 6: Server-Side Patient Search & Pagination (Goal 6)

### Prompt
> "How should we implement search and pagination for the appointments table? It needs to search over patient names, filter by provider, status, and date range, with sort and pagination. How do we keep this fast?"

### What you got
The AI suggested using Prisma `findMany()` with `take: 10, skip: (page - 1) * 10`, and used standard `contains` mode for patient name search.

### What you corrected
1. **Slow Substring Search:** Standard `LIKE '%term%'` on large tables forces slow sequential table scans. In migration `008_indexes.sql`, I enabled `pg_trgm` and created a GIN trigram index on `patients(full_name)`, turning substring searches into sub-10ms index scans.
2. **URL-Driven State:** The AI kept pagination and search state in React component `useState`. I refactored the filters to be completely URL search-param driven (`?search=...&status=...&page=2`), allowing bookmarked filters, native browser back-button navigation, and instant server-side rendering.

---

## Step 7: Deriving Urgent Unconfirmed Alerts (Goal 10)

### Prompt
> "How can I derive Goal 10 alerts purely in TypeScript/SQL? The requirement: flag appointments in 'requested' status within 24 hours of start. Front desk can dismiss them, but if it's still unconfirmed 1 hour before start, the alert has to pop right back up. I don't want a background cron worker."

### What you got
The AI gave me a quick in-memory filter:
`const isUrgent = appt.status === 'requested' && diffInHours <= 24 && diffInHours > 0 && (!appt.alert_dismissed_at || diffInHours <= 1);`

### What you corrected
The math had two blind spots:
1. **Vanishing Overdue Visits:** The moment an unconfirmed visit hit its start time (`diffInHours <= 0`), it vanished from the queue. But in a real clinic, an unconfirmed patient who is late is an active operational emergency for the front desk, not something to hide. I updated the logic so overdue unconfirmed visits stick around until someone explicitly marks them No-Show or Cancelled.
2. **Timezone Quirks:** The AI used naive local `Date` arithmetic that behaved inconsistently between server and client. I shifted the date comparisons to server-side query filters using `date-fns` UTC helpers and added 8 unit tests in `tests/unit/alerts.test.ts` to make sure the 24h window, dismissal suppression, and 1h reappearance rule all worked reliably.

---

## Step 8: Operational Dashboard & Zero-JS Charting (Goal 8)

### Prompt
> "We need a clinic dashboard showing headline numbers (today's appointments, checked in now, no-shows this week, upcoming confirmed), breakdown by provider and status, and an 8-week historical weekly no-show rate chart."

### What you got
The AI recommended installing `recharts` (adding ~350KB to the client bundle) and writing multiple client-side `useEffect` hooks fetching raw appointment rows to aggregate in JavaScript.

### What you corrected
1. **Bundle Bloat:** Recharts caused SSR hydration mismatches in Next.js 15 App Router. I built a custom SVG/HTML chart component (`EvilAnalyticsChart.tsx`) styled with Tailwind CSS, supporting toggleable Grouped Bars and Smooth Wave splines with zero client bundle overhead.
2. **Database Aggregation:** Rather than shipping thousands of raw records to the browser, I created index-backed aggregate queries in `lib/dashboard/queries.ts` using SQL `COUNT(*) FILTER (...)` to compute all metrics directly inside PostgreSQL in under 15ms.

---

## Step 9: Making Tab Transitions Instant (<80ms)

### Prompt
> "In Next.js 15 App Router, switching between dashboard tabs (Schedule, Appointments, Patients, Alerts) feels sluggish and hesitates for half a second (>500ms). What's causing this server-side delay, and how do I get page switching under 80ms?"

### What you got
The AI went straight for the nuclear option: it told me to ditch React Server Components, download all clinic history into a client-side Zustand or Redux store on login, and turn the app into an SPA.

### What you corrected
I pushed back hard on that. Ditching Server Components would have bloated our JS bundle and created a messy client-side data sync headache just as patient records grew.

When I profiled the network waterfall, the real issue was obvious: every layout and page component was independently calling `supabase.auth.getUser()`, hammering Supabase with 3–4 redundant auth checks on every single click.

I fixed it cleanly without changing our architecture:
- Wrapped our user session lookup in React's native `cache()` function (`lib/auth/get-current-user.ts`) so auth is resolved once per request cycle.
- Added `prefetch={true}` to our navigation links so Next.js warms up the next route ahead of time.
- Cached static provider lists with Next.js `unstable_cache`.

Page transitions dropped from 500ms+ to an instantaneous sub-80ms snap.

---

## Step 10: Writing Unit Tests for Business Logic

### Prompt
> "We need to set up Vitest unit tests for our clinic scheduling rules. Provide a test suite covering the appointment status state machine, front-desk vs provider permission matrices, and recurring slot generation."

### What you got
The AI tried importing Server Actions directly into test files (`import { bookAppointmentAction } from '@/lib/appointments/actions'`) and wrote massive `vi.mock()` blocks attempting to fake Next.js headers, cookies, and Supabase client internals.

### What you corrected
The tests blew up immediately with module resolution errors because mocking Next.js server runtime internals in Vitest is notoriously brittle.

I stepped back and refactored the approach: our core business rules in `lib/` (like `isValidStatusTransition`, `canPerformAction`, and `generateTimeSlots`) were already written as pure TypeScript functions. Instead of mocking the entire server environment, I pointed the tests directly at those pure functions with clean mock data objects.

We ended up with 42 fast, isolated unit tests across 7 test files that run in under 200ms with zero database dependencies or brittle mocks.

---

## Step 11: Production Build & Lint Error Cleanup

### Prompt
> "Next.js 15 `next build` failed with ESLint errors: unescaped quotes in `app/(dashboard)/page.tsx`, raw `<a>` tags in `AppointmentFilters.tsx`, and an `any` type in `lib/alerts/queries.ts`. How should I fix these?"

### What you got
The AI took the lazy way out and suggested disabling the ESLint rules in `.eslintrc.json`:
```json
{
  "rules": {
    "react/no-unescaped-entities": "off",
    "@next/next/no-html-link-for-pages": "off",
    "@typescript-eslint/no-explicit-any": "off"
  }
}
```

### What you corrected
Telling the linter to look the other way is bad practice and hides real bugs down the road.

I rejected disabling the rules and fixed the code properly:
- Replaced raw apostrophes in JSX text with `&apos;`.
- Swapped raw HTML `<a>` tags for `next/link` `<Link>` components so client-side prefetching works properly without hard page refreshes.
- Replaced the `any` in `lib/alerts/queries.ts` with explicit TypeScript interface types matching our database rows.

Re-ran `npm run build`, and the bundle compiled cleanly with zero errors and zero warnings.