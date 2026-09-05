# AI prompts

The prompts you actually used, in the order you used them, grouped by what you were trying to achieve. For each significant one: what you asked, what you got back, and what you had to correct.

Include at least one prompt that produced something wrong, and what you did about it.

If you did not use AI at all, say so here, and describe your process instead.

## 1. Concurrency-Safe Schema & GiST Overlap Constraints

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

## 2. Deriving Urgent Unconfirmed Alerts (Goal 10)

### Prompt
> "How can I derive Goal 10 alerts purely in TypeScript/SQL? The requirement: flag appointments in 'requested' status within 24 hours of start. Front desk can dismiss them, but if it's still unconfirmed 1 hour before start, the alert has to pop right back up. I don't want a background cron worker."

### What you got
The AI gave me a quick in-memory filter:
`const isUrgent = appt.status === 'requested' && diffInHours <= 24 && diffInHours > 0 && (!appt.alert_dismissed_at || diffInHours <= 1);`

### What you corrected
The math had a blind spot:
1. **Vanishing Overdue Visits:** The moment an unconfirmed visit hit its start time (`diffInHours <= 0`), it vanished from the queue. But in a real clinic, an unconfirmed patient who is 10 minutes late is an active operational emergency for the front desk, not something to hide under the rug. I updated the logic so overdue unconfirmed visits stick around until someone explicitly marks them No-Show or Cancelled.
2. **Timezone Quirks:** The AI used naive local `Date` arithmetic that behaved inconsistently between server and client. I shifted the date comparisons to server-side query filters using `date-fns` UTC helpers and added 8 unit tests in `tests/unit/alerts.test.ts` to make sure the 24h window, dismissal suppression, and 1h reappearance rule all worked reliably.

---

## 3. Making Tab Transitions Instant (<80ms)

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

## 4. Writing Unit Tests for Business Logic

### Prompt
> "We need to set up Vitest unit tests for our clinic scheduling rules. Provide a test suite covering the appointment status state machine, front-desk vs provider permission matrices, and recurring slot generation."

### What you got
The AI tried importing Server Actions directly into test files (`import { bookAppointmentAction } from '@/lib/appointments/actions'`) and wrote massive `vi.mock()` blocks attempting to fake Next.js headers, cookies, and Supabase client internals.

### What you corrected
The tests blew up immediately with module resolution errors because mocking Next.js server runtime internals in Vitest is notoriously brittle.

I stepped back and refactored the approach: our core business rules in `lib/` (like `isValidStatusTransition`, `canPerformAction`, and `generateTimeSlots`) were already written as pure TypeScript functions. Instead of mocking the entire server environment, I pointed the tests directly at those pure functions with clean mock data objects.

We ended up with 42 fast, isolated unit tests across 7 test files that run in under 200ms with zero database dependencies or brittle mocks.

---

## 5. Cleaning Up Production Build & Lint Errors

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