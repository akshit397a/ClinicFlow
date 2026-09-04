# Submission

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** https://github.com/akshit397a/ClinicFlow
- **Live application:** https://clinic-flow-plum.vercel.app/

## Notes for the reviewer

The application is deployed on Vercel with a managed Supabase PostgreSQL database. If the serverless lambdas have been idle, the initial cold-start request may take a brief moment (2–3 seconds), after which navigation, queries, and mutations run smoothly with sub-80ms latency. All demo accounts listed below are pre-seeded and ready to log in immediately with `password123`.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Front Desk | `front_desk.one@clinic.test` | `password123` |
| Front Desk (Alt) | `front_desk.two@clinic.test` | `password123` |
| Provider (Alice Smith) | `provider.alice@clinic.test` | `password123` |
| Provider (Bob Nguyen) | `provider.bob@clinic.test` | `password123` |
| Provider (Carol Gomez) | `provider.carol@clinic.test` | `password123` |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | Next.js 15 (App Router, React 19), TypeScript, Tailwind CSS, Lucide Icons | React Server Components minimize client bundle size and provide fast initial paint with zero client JS waterfalls; Tailwind CSS offers lean, responsive utility styling with zero runtime CSS overhead; TypeScript enforces strict compile-time type contracts with the database schema. |
| Backend | Next.js Server Actions & Route Handlers (Node.js runtime), Zod, `@supabase/ssr` | Server Actions eliminate REST endpoint boilerplate and keep mutations strictly on the server; Zod provides robust runtime input validation before hitting the database; mutations execute via the trusted service-role client to enforce explicit RBAC (`requireRole`) and append-only audit logging while bypassing public client tampering. |
| Database | PostgreSQL (via Supabase), Prisma ORM / SQL Migrations, `btree_gist`, `pg_trgm` | PostgreSQL delivers enterprise relational integrity; GiST exclusion constraints (`btree_gist` + `tstzrange`) mathematically prevent double-booking race conditions at the database engine level; `pg_trgm` GIN indexes enable instant server-side substring name search; RLS restricts direct client writes, guaranteeing an unforgeable audit trail. |
| Hosting | Vercel (Next.js Application) + Supabase Cloud (Managed PostgreSQL & Auth) | Vercel provides native zero-config deployments with global edge caching and fast serverless execution; Supabase provides fully managed PostgreSQL with built-in connection pooling (PgBouncer), automated backups, and integrated authentication sessions. |

## Goal checklist

Mark each honestly. Partial is fine — say what is partial.

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Built distinct front-desk and provider roles. Front desk gets full operational control across the clinic (reassigning doctors, opening slots, managing bookings), while providers can only see and manage their own day. All permission checks are strictly enforced on the server. |
| 2 | Appointment slots | Done | Used a single unified scheduling table for both open slots and booked visits. Unbooked slots can be adjusted or archived (soft-deleted), and once a patient requests a time, it smoothly transitions into an active booking without losing any past history. |
| 3 | Visit notes | Done | Providers can jot down free-text clinical notes right from the appointment drawer. They show up in chronological order, and only the doctor who wrote a note can edit it. Blank notes are blocked at both the app and database levels. |
| 4 | Appointment status | Done | Follows the exact Requested → Confirmed → Checked In → Completed lifecycle. You can only mark No-Show after the appointment time has passed, and cancellations require an explicit reason and get blocked once checked in. Any illegal jump gives a clear explanation. |
| 5 | Care team | Done | Primary providers can attach assisting colleagues (like residents or nurses) to any visit. Composite keys prevent accidental duplicate assignments, and providers get a unified view of all visits where they're either lead or supporting. |
| 6 | Finding appointments | Done | Search, filters, sorting, and pagination all run server-side—no dumping huge payloads into the browser. Includes instant patient name substring search, multi-field filters, and clean 10-per-page pagination with total count tracking. |
| 7 | Bulk availability generation | Done | Front desk can spin up recurring weekly time blocks across multiple months in one go. The database exclusion constraint catches collisions on the fly and reports back exactly which slots were created and which were skipped. Also included a clean CSV day export. |
| 8 | A dashboard | Done | Gives staff an instant pulse of the day: today's visits, who is checked in right now, and upcoming confirmed slots. Added breakdowns by provider and status, plus a lightweight 8-week historical no-show trend chart that loads with zero client lag. |
| 9 | History you cannot rewrite | Done | Every single status flip, care team change, cancellation reason, and note creation logs to an append-only audit trail. Database RLS rules block all client updates and deletes, so not even front desk staff can erase past events. |
| 10 | Unconfirmed alerts | Done | Any appointment left in Requested status within 24 hours of start triggers an alert badge for front desk staff. Staff can dismiss it, but if it's still unconfirmed 1 hour before start, it automatically pops back up so nobody slips through the cracks. |

## How much time did you actually spend?

Around **13 hours total**, split across focused sessions over the week:
* **Database & Integrity (~2.5 hrs):** Schema design, `btree_gist` exclusion constraints to prevent double-booking, RLS policies, and realistic seed fixtures.
* **Domain Logic & Auth (~1.5 hrs):** Status lifecycle state machine, role-based permission matrix, and Zod schemas.
* **Core Scheduling UI (~4.0 hrs):** Per-provider day calendar, slot generation modals, encounter notes drawer, and care-team selector.
* **Patients, Alerts & Dashboard (~2.0 hrs):** Trigram search, 24h/1h alert engine, and the 8-week no-show trend chart.
* **Testing, Speed & Polish (~3.0 hrs):** 42 Vitest unit tests, sub-80ms page transition caching, build cleanups, and documentation.

The trickiest part was fine-tuning the PostgreSQL exclusion constraint with partial indexes so cancelled and archived slots cleanly free up time without race conditions.

## What would you do next, with another 12 hours?

1. **Automated Patient SMS/Email Reminders (Twilio/Resend):** Send 1-click confirmation links 24h in advance so patients self-confirm on their phones, clearing the front desk's alert queue automatically.
2. **Cancellation Auto-Fill / Waitlist:** When a patient cancels, instantly suggest the next waiting patient for that doctor to keep clinic chairs filled.
3. **Drag-and-Drop Calendar Rescheduling:** Keep the current modal safety, but add quick drag-and-drop on desktop to help receptionists shuffle schedules during the morning rush.
4. **Audit Log Partitioning:** Partition `appointment_audit_events` by month in PostgreSQL to keep queries snappy as records hit hundreds of thousands.

## What are you least happy with in this codebase, and why?

1. **Two-Step Audit Logging:** Right now, the mutation runs first and the audit entry is appended in a second call because the Supabase JS client doesn't support multi-statement transactions out of the box. While errors are logged, it's not strictly atomic—in a true enterprise clinical system, I'd wrap both in a single database-level transaction (`BEGIN ... COMMIT`) via a custom RPC function.
2. **Prisma + Supabase Duplication:** We started with Prisma types and then moved to native SQL migrations to leverage PostgreSQL's GiST exclusion constraints and trigram indexes. Having both works fine, but it adds minor maintenance overhead. If starting fresh, I’d stick 100% to a single type-safe query builder like Kysely.
