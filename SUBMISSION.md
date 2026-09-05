# Submission

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

### Stretch ideas checklist (optional)

| # | Stretch Idea | Status | Notes |
|---|--------------|--------|-------|
| S1 | Automated reminder messages before an appointment | Partial | The 24-hour urgent unconfirmed alert detection engine is fully operational in `lib/alerts/engine.ts`, and patient records capture contact details (`phone`, `email`). Outbound SMS/email webhook dispatch (e.g. Twilio/Resend) was intentionally left unhooked to avoid external carrier API key dependencies during take-home evaluation. |
| S2 | Recurring appointments for ongoing treatment plans | Partial | Implemented multi-week recurring availability generation across custom date ranges with automated overlap collision skipping (`lib/availability/generation.ts`). Patients can be scheduled into any recurring slot series via the calendar; a 1-click batch multi-week patient booking macro was left for the next phase. |
| S3 | A patient-facing self-service booking view | Scoped out | Evaluated during initial architecture and intentionally omitted. The specification strictly designates clinic staff (receptionists and providers) as the system users; introducing unauthenticated public booking would compromise clinical triage safety, slot reservation locks, and provider schedule control. |
| S4 | A waitlist for fully booked days | Scoped out | When an appointment is cancelled, the partial GiST exclusion index immediately frees up the provider's slot for rebooking. However, an automated FIFO waitlist queue with automatic patient notification was prioritized behind the 10 core deliverables. |
| S5 | Per-visit-type default durations | Partial | The database schema (`duration_minutes`), slot controls, and bulk generator dynamically support variable durations (15, 30, 45, and 60 minutes) per appointment, which render cleanly on the schedule grid and CSV export. A standalone administrative "Visit Types" dictionary table was not normalized. |
| S6 | Room or equipment assignment alongside provider | Scoped out | The operational dashboard tracks clinic-wide room queues, and the multi-provider Care Team feature (`appointment_supporting_providers`) handles multi-staff presence per visit. Physical room/equipment collision tables were omitted to keep the relational model clean. |
| S7 | A printable day sheet for the front desk | Done | Built a dedicated single-day chronological schedule view on `/schedule` showing exact patient times, provider badges, and statuses, paired with a 1-click single-day RFC-4180 CSV export (`/api/schedules/csv`) capturing date, start/end, duration, provider, patient, and status for physical printing and morning desk rostering. |
| S8 | Billing notes per visit | Done | Implemented the Visit Notes drawer (`visit_notes`) on every appointment, allowing providers to record free-text clinical and billing/CPT documentation with author lockdown, edit indicator badges, and immutable audit events (`NOTE_ADDED`, `NOTE_EDITED`). A separate isolated billing-only ledger was not partitioned. |
| S9 | An email digest of tomorrow's unconfirmed appointments | Partial | The 24-hour unconfirmed query engine, escalation sorting, and visual digest are fully operational on the Front Desk Dashboard and `/alerts` page with active count badges. Automated daily SMTP cron delivery at 6 PM was deferred to avoid external mail server credentials. |


## How much time did you actually spend?

Around **13 hours total**, split across focused sessions over the week:
* **Database & Integrity (~2.5 hrs):** Schema design, `btree_gist` exclusion constraints to prevent double-booking, RLS policies, and realistic seed fixtures.
* **Domain Logic & Auth (~1.5 hrs):** Status lifecycle state machine, role-based permission matrix, and Zod schemas.
* **Core Scheduling UI (~4.0 hrs):** Per-provider day calendar, slot generation modals, encounter notes drawer, and care-team selector.
* **Patients, Alerts & Dashboard (~2.0 hrs):** Trigram search, 24h/1h alert engine, and the 8-week no-show trend chart.
* **Testing, Speed & Polish (~3.0 hrs):** 42 Vitest unit tests, sub-80ms page transition caching, build cleanups, and documentation.

The trickiest part was fine-tuning the PostgreSQL exclusion constraint with partial indexes so cancelled and archived slots cleanly free up time without race conditions.

## What would you do next, with another 12 hours?

1. **Automated Patient SMS/Email Reminders & Self-Confirmation (Stretch #1 & #9):** Hook our 24-hour unconfirmed query engine into Twilio and Resend webhooks so patients receive SMS/email confirmation links 24 hours prior to visits. Patient clicks would automatically confirm the appointment and dismiss front-desk alert badges, paired with a daily 6 PM cron emailing tomorrow's unconfirmed summary to the front desk.
2. **Cancellation Auto-Fill & Patient Waitlist Queue (Stretch #4):** Build a dedicated FIFO waitlist queue that hooks into appointment cancellations (which already unlock time slots via our partial GiST index), allowing receptionists to backfill open chairs in one click.
3. **1-Click Batch Recurring Treatment Plan Booking (Stretch #2):** Extend our bulk recurring availability generator into a patient treatment-plan booking wizard, reserving a series of 6–10 consecutive weekly visits in a single atomic database transaction.
4. **Configurable Visit-Type Catalog & Durations (Stretch #5):** Abstract our dynamic slot durations (15/30/45/60m) into a clinic admin dictionary table mapping clinical visit types (Initial Assessment, Routine Follow-up, Injection) to default durations and billing codes.
5. **Physical Room & Equipment Scheduling Constraints (Stretch #6):** Model physical examination rooms and specialized machines with secondary GiST exclusion constraints alongside the Care Team model to prevent room double-booking.
6. **Audit Log Partitioning & Transactional RPC Atomicity:** Partition `appointment_audit_events` by month in PostgreSQL and consolidate the two-step mutation/audit write into a single native database transaction RPC.

## What are you least happy with in this codebase, and why?

1. **Two-Step Audit Logging:** Right now, the mutation runs first and the audit entry is appended in a second call because the Supabase JS client doesn't support multi-statement transactions out of the box. While errors are logged, it's not strictly atomic—in a true enterprise clinical system, I'd wrap both in a single database-level transaction (`BEGIN ... COMMIT`) via a custom RPC function.
2. **Prisma + Supabase Duplication:** We started with Prisma types and then moved to native SQL migrations to leverage PostgreSQL's GiST exclusion constraints and trigram indexes. Having both works fine, but it adds minor maintenance overhead. If starting fresh, I’d stick 100% to a single type-safe query builder like Kysely.
3. **Incomplete Carrier Hooks for Stretch Reminders:** While we built the complete mathematical unconfirmed alert engine, single-day CSV export, dynamic durations, and care team collaboration, we chose not to wire up external paid carrier APIs (Twilio SMS, Resend SMTP) or complex multi-week patient booking macros to keep the submission 100% self-contained, zero-dependency, and instantly runnable for review. In a commercial deployment, having automated outbound patient SMS confirmation would significantly reduce front-desk phone calls.
