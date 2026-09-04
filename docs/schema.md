# ClinicFlow Database Schema & Architecture

> **Developer Perspective & Design Rationale**  
> As the full-stack developer building ClinicFlow, this document breaks down the database architecture, entity relationships, constraint boundaries, intentional denormalizations, and scale bottlenecks in my own words.

---

## 1. Table by Table: Columns, Types, and Storage Design

The database schema runs on PostgreSQL (via Supabase) and uses 6 core application tables alongside extensions (`pgcrypto`, `btree_gist`, `pg_trgm`).

### `profiles`
Maps 1:1 with Supabase `auth.users` to manage staff identity, credentials link, and clinic roles (`front_desk` vs `provider`).

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `PK`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Directly shares the auth UUID. |
| `email` | `text` | No | None | Synced from auth user record. |
| `full_name` | `text` | No | `''` | Display name for providers and front desk staff. |
| `role` | `text` | No | `CHECK (role IN ('front_desk', 'provider'))` | Restricts access permissions across the system. |
| `created_at` | `timestamptz`| No | `now()` | Audit creation timestamp. |
| `updated_at` | `timestamptz`| No | `now()` | Auto-updated via `set_updated_at()` trigger. |

*Trigger behavior*: When a new user is created in Supabase Auth, the database trigger `on_auth_user_created` automatically inserts a corresponding row into `profiles`. The role defaults strictly to `'front_desk'` so newly created accounts can never self-elevate permissions.

---

### `patients`
Stores patient demographic and contact records. Patients are **not** system users; they do not have auth credentials, passwords, or login access. They are registered and managed strictly by clinic staff.

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `PK`, `default gen_random_uuid()` | Unique patient identifier. |
| `full_name` | `text` | No | None | Primary search target (indexed via trigram). |
| `email` | `text` | Yes | None | Optional contact email. |
| `phone` | `text` | Yes | None | Optional phone number. |
| `date_of_birth` | `date` | Yes | None | Patient date of birth for clinical records. |
| `created_at` | `timestamptz`| No | `now()` | Record creation timestamp. |
| `updated_at` | `timestamptz`| No | `now()` | Auto-updated via trigger. |

---

### `appointments`
The central scheduling table. Instead of maintaining two disjointed tables for "availability slots" and "booked appointments", I designed `appointments` as a **single unified scheduling entity**. 

*Interpretation*:
- `patient_id IS NULL AND status IS NULL`: Represents an **available provider time slot**.
- `patient_id IS NOT NULL AND status IS NOT NULL`: Represents an **actively booked appointment**.
- There is deliberately no redundant `"available"` status enum; availability is simply the absence of a patient and status.

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `PK`, `default gen_random_uuid()` | Primary key. |
| `provider_id` | `uuid` | No | `REFERENCES profiles(id) ON DELETE RESTRICT` | Primary doctor responsible for the slot/visit. |
| `patient_id` | `uuid` | Yes | `REFERENCES patients(id) ON DELETE RESTRICT` | Null for open slot; populated on booking. |
| `scheduled_start` | `timestamptz`| No | None | Start time of the appointment/slot. |
| `duration_minutes`| `integer` | No | `CHECK (duration_minutes > 0)` | Standard 15, 30, 45, or 60 min slots. |
| `service_range` | `tstzrange` | No | `GENERATED ALWAYS AS (tstzrange(scheduled_start, scheduled_start + (duration_minutes * interval '1 min'))) STORED` | Half-open time interval `[start, end)` used for GiST overlap exclusion. |
| `status` | `text` | Yes | `CHECK (status IN ('requested', 'confirmed', 'checked_in', 'completed', 'no_show', 'cancelled'))` | Clinical encounter lifecycle status. |
| `cancellation_reason`| `text`| Yes | None | Mandatory when status transitions to `cancelled`. |
| `archived_at` | `timestamptz`| Yes | None | Soft-deletion timestamp for unbooked slots. |
| `archived_by` | `uuid` | Yes | `REFERENCES profiles(id) ON DELETE SET NULL` | Staff member who removed the slot. |
| `alert_dismissed_at`| `timestamptz`| Yes | None | Timestamp when 2h unconfirmed alert was dismissed. |
| `alert_dismissed_by`| `uuid` | Yes | `REFERENCES profiles(id) ON DELETE SET NULL` | Staff member who acknowledged the alert. |
| `created_at` | `timestamptz`| No | `now()` | Record creation timestamp. |
| `updated_at` | `timestamptz`| No | `now()` | Auto-updated via trigger. |

---

### `appointment_supporting_providers`
Join table representing the care team assigned to assist on an appointment (e.g. assisting surgeon, resident, anesthesiologist, nurse).

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| :--- | :--- | :--- | :--- | :--- |
| `appointment_id` | `uuid` | No | `REFERENCES appointments(id) ON DELETE CASCADE` | Part 1 of composite primary key. |
| `provider_id` | `uuid` | No | `REFERENCES profiles(id) ON DELETE CASCADE` | Part 2 of composite primary key. |
| `assigned_by` | `uuid` | No | `REFERENCES profiles(id) ON DELETE SET NULL` | Staff member who assigned this provider. |
| `assigned_at` | `timestamptz`| No | `now()` | Assignment timestamp. |

*Primary Key*: `PRIMARY KEY (appointment_id, provider_id)`. Prevents duplicate provider assignments at the database engine level.

---

### `visit_notes`
Encounter consultation notes recorded by providers during or after an appointment.

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `PK`, `default gen_random_uuid()` | Note identifier. |
| `appointment_id` | `uuid` | No | `REFERENCES appointments(id) ON DELETE CASCADE` | Associated appointment. |
| `author_provider_id`| `uuid` | No | `REFERENCES profiles(id) ON DELETE RESTRICT` | Provider author; restricted delete ensures medical record permanence. |
| `content` | `text` | No | `CHECK (length(trim(content)) > 0)` | Clinical note body (cannot be empty/whitespace). |
| `created_at` | `timestamptz`| No | `now()` | Creation timestamp. |
| `updated_at` | `timestamptz`| No | `now()` | Auto-updated via trigger. |

---

### `appointment_audit_events`
Append-only legal audit log. Rows are only ever inserted; no client or authenticated user has update or delete permissions on this table.

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `PK`, `default gen_random_uuid()` | Audit event ID. |
| `appointment_id` | `uuid` | No | `REFERENCES appointments(id) ON DELETE RESTRICT` | Target appointment; restricts deletion if audit trail exists. |
| `event_type` | `text` | No | `CHECK (event_type IN ('STATUS_CHANGED', 'SUPPORTING_PROVIDER_ADDED', 'SUPPORTING_PROVIDER_REMOVED', 'CANCELLED', 'NOTE_ADDED', 'SLOT_CREATED', 'SLOT_ARCHIVED'))` | Explicit categorized event. |
| `actor_id` | `uuid` | Yes | `REFERENCES profiles(id) ON DELETE SET NULL` | The authenticated user who performed the mutation. |
| `old_status` | `text` | Yes | None | Pre-transition status. |
| `new_status` | `text` | Yes | None | Post-transition status. |
| `supporting_provider_id`| `uuid`| Yes | `REFERENCES profiles(id) ON DELETE SET NULL` | Associated supporting provider (for team changes). |
| `cancellation_reason` | `text` | Yes | None | Reason captured at cancellation time. |
| `note_id` | `uuid` | Yes | `REFERENCES visit_notes(id) ON DELETE SET NULL` | Associated note reference (for `NOTE_ADDED`). |
| `metadata` | `jsonb` | Yes | None | Structured snapshot metadata (names, IPs, contextual state). |
| `created_at` | `timestamptz`| No | `now()` | Immutable timestamp of the event. |

---

## 2. Entity Relationships: One-to-Many vs Many-to-Many

### One-to-Many ($1:N$) Relationships

1. **`profiles` (Provider) $\rightarrow$ `appointments` ($1:N$)**  
   - A single provider can host many scheduled slots and appointments over time.
   - Foreign key: `appointments.provider_id` referencing `profiles.id`.
   - On delete: `RESTRICT` (a provider cannot be deleted while active clinical appointments reference them).

2. **`patients` $\rightarrow$ `appointments` ($1:N$)**  
   - A single patient can have multiple appointments (visit history) over their lifetime, but each booked appointment belongs to exactly one patient.
   - Foreign key: `appointments.patient_id` referencing `patients.id`.
   - On delete: `RESTRICT` (prevents deleting a patient record if clinical appointment history exists).

3. **`appointments` $\rightarrow$ `visit_notes` ($1:N$)**  
   - An appointment can have multiple clinical notes taken during an encounter (e.g. initial triage note, doctor's exam notes, supporting specialist notes).
   - Foreign key: `visit_notes.appointment_id` referencing `appointments.id`.
   - On delete: `CASCADE` (if an uncommitted draft appointment is removed).

4. **`profiles` (Author) $\rightarrow$ `visit_notes` ($1:N$)**  
   - A provider can author many clinical notes across different patients and dates.
   - Foreign key: `visit_notes.author_provider_id` referencing `profiles.id`.
   - On delete: `RESTRICT` (medical records must retain clinical author attribution).

5. **`appointments` $\rightarrow$ `appointment_audit_events` ($1:N$)**  
   - Every appointment has an append-only timeline of audit events documenting its creation, status transitions, care team changes, and cancellations.
   - Foreign key: `appointment_audit_events.appointment_id` referencing `appointments.id`.
   - On delete: `RESTRICT` (prevents removing an appointment that has an established legal audit trail).

6. **`profiles` (Actor) $\rightarrow$ `appointment_audit_events` ($1:N$)**  
   - A staff member (actor) can trigger many audit events across the clinic.
   - Foreign key: `appointment_audit_events.actor_id` referencing `profiles.id`.
   - On delete: `SET NULL` (if an employee account is removed, the historical audit action remains intact).

---

### Many-to-Many ($N:M$) Relationships

1. **`appointments` $\longleftrightarrow$ `profiles` (Supporting Providers) ($N:M$)**  
   - **The Reality**: An appointment often requires multiple healthcare professionals (e.g. a primary surgeon plus an anesthesiologist and an assisting provider). Conversely, a provider can be assigned as a supporting provider across many different appointments.
   - **Implementation**: Modeled via the join table `appointment_supporting_providers`.
   - **Duplicate Prevention**: The join table defines a composite primary key `(appointment_id, provider_id)`. This structurally prevents a provider from being assigned twice to the same appointment at the database engine level.

---

## 3. Constraints: Database vs. Application Code & Architectural Rationale

### Where I Drew the Line & Why

As a full-stack engineer, my core architectural principle is:  
> **"The database must protect physical data integrity, concurrency invariants, and relational validity; the application code orchestrates temporal workflows, contextual permissions, and user feedback."**

If two users perform an action at the exact same millisecond, application-level checks (like a `SELECT` followed by an `INSERT`) will suffer from Time-of-Check to Time-of-Use (TOCTOU) race conditions. Anything that corrupts scheduling integrity under concurrency **must** be enforced by the database. Anything requiring dynamic time evaluation (`now()`), multi-step workflow logic, or role-based user experience belongs in the application layer.

| Constraint | Enforced By | Mechanism | Rationale |
| :--- | :--- | :--- | :--- |
| **Provider Schedule Overlap (No Double Booking)** | **Database** | PostgreSQL `EXCLUDE USING gist (provider_id WITH =, service_range WITH &&)` | Two concurrent booking requests hitting the API at the exact same millisecond would both pass an application `SELECT` check. A GiST exclusion constraint evaluates locks atomically in PostgreSQL, guaranteeing zero overlapping slots for any provider. |
| **Slot vs. Appointment State Validity** | **Database** | `CHECK ((patient_id IS NULL AND status IS NULL) OR (patient_id IS NOT NULL AND status IS NOT NULL))` | Guarantees that a row can never enter an impossible hybrid state (e.g. having a patient but no status, or a status without a patient). |
| **Mandatory Cancellation Reason** | **Database** | `CHECK (cancellation_reason IS NOT NULL OR status IS DISTINCT FROM 'cancelled')` | Prevents cancellations from being saved without clinical/operational justification, even if an API route or migration script misbehaves. |
| **Positive Duration** | **Database** | `CHECK (duration_minutes > 0)` | Prevents zero or negative time spans that would break calendar math and interval calculations. |
| **Non-Empty Clinical Notes** | **Database** | `CHECK (length(trim(content)) > 0)` | Enforces medical record validity; prevents saving blank or whitespace-only visit notes. |
| **Duplicate Supporting Provider Prevention** | **Database** | `PRIMARY KEY (appointment_id, provider_id)` | Eliminates duplicate assignments without needing table lock queries. |
| **Audit Trail Immutability** | **Database** | Supabase Row Level Security (RLS) | Tables have `SELECT` policies for authenticated users, but **zero** `INSERT`/`UPDATE`/`DELETE` policies. Public clients cannot forge or edit audit events. |
| **Temporal Rules (e.g. No-Show Timing)** | **Application** | TypeScript / Server Actions (`scheduled_start <= new Date()`) | PostgreSQL `CHECK` constraints must be immutable functions and cannot reference dynamic `now()`. Determining whether an appointment start time has arrived requires application-time evaluation. |
| **Booking in the Past Prevention** | **Application** | Zod Schema Validation | Generating slots or booking appointments before `now()` is rejected during request validation to give users instant, human-friendly error messages. |
| **Role-Based Permissions (RBAC)** | **Application** | Next.js Server Action guards (`requireRole`, `requireAuth`) | Only front desk users can create patients or reassign providers; providers can only write notes on appointments where they are primary or supporting staff. |
| **Note Authorship Permanence** | **Application** | Action authorization (`existingNote.author_provider_id === session.user.id`) | A provider can only edit notes they personally authored. Other providers on the care team can read and append new notes, but cannot overwrite a colleague's notes. |
| **State Machine Transitions** | **Application** | Status transition state machine in server actions | Validates legal business progressions (e.g. `requested` $\rightarrow$ `confirmed` $\rightarrow$ `checked_in` $\rightarrow$ `completed`; disallowing moving a `completed` appointment back to `requested`). |

---

## 4. Deliberate Denormalizations and Why I Chose Them

In textbook database normalization (3NF/BCNF), every non-key attribute must depend strictly on the key and nothing else. In production healthcare scheduling, strict normalization harms performance and compromises audit integrity. I made four deliberate denormalization choices:

### 1. `service_range` Stored Generated Column on `appointments`
- **What it is**: `service_range` is generated automatically from `scheduled_start` and `duration_minutes` as a `tstzrange` (`[start, start + duration)`).
- **Why I denormalized it**: PostgreSQL GiST indexes for exclusion constraints cannot index arbitrary runtime expressions without a stored column or a functional index. By storing `service_range` directly on the row, the GiST index operates directly on the stored range. Furthermore, scheduling conflict queries (`WHERE service_range && ...`) run at index-scan speed without computing interval arithmetic on every query.

### 2. Direct `author_provider_id` on `visit_notes`
- **What it is**: `visit_notes` contains a direct foreign key to `profiles(id)`, even though `visit_notes` already links to `appointments(id)` (which has a `provider_id`).
- **Why I denormalized it**: Appointments have a care team: a primary provider and multiple supporting providers. If note authorship were inferred solely from the appointment, we could never know which doctor wrote the note. Additionally, if the front desk reassigns the primary doctor on an appointment, the historical clinical notes must remain permanently attributed to the doctor who actually treated the patient and typed the note.

### 3. Redundant Snapshot Fields & JSONB `metadata` in `appointment_audit_events`
- **What it is**: The audit table stores `old_status`, `new_status`, `cancellation_reason`, `actor_id`, and a JSONB snapshot of contextual state at the moment the event took place.
- **Why I denormalized it**: A normalized audit design might store pointers to diff tables or entity IDs. However, real-world audit logs must be **immutable historical snapshots**. If a patient updates their name, or a provider leaves the clinic, the audit log must reflect the exact state of reality at the moment the event occurred, without requiring complex reconstruction across altered or deleted records.

### 4. Single Polymorphic `appointments` Table (Slot + Appointment)
- **What it is**: Available slots and booked appointments live in the same table, differentiated only by whether `patient_id` and `status` are null.
- **Why I denormalized it**: A fully normalized design would separate `provider_availability_slots` from `booked_appointments`. However, that design requires a dangerous two-phase distributed transaction: deleting the slot while inserting the appointment. If a race condition occurs, double-bookings slip through. By keeping them in one table, booking a slot is an atomic `UPDATE` guarded by the single database exclusion constraint.

---

## 5. What Would Break First at 100x Data Scale?

If ClinicFlow scaled from thousands of appointments to **100x the data volume** (e.g. 500,000+ appointments, 100,000+ patients, and millions of audit rows), here are the exact architectural bottlenecks that would break first and how I would resolve them:

```
+-----------------------------------------------------------------------------------+
|                           100x SCALE BOTTLENECK ANALYSIS                          |
+-----------------------------------------------------------------------------------+
| 1. appointment_audit_events  --> Table Bloat & Write Saturation (Millions of rows)|
| 2. pg_trgm (Name Search)     --> RAM Exhaustion on In-Memory GIN Trigram Indexes  |
| 3. GiST Exclusion Index      --> Buffer Pool Cache Eviction & Slower Slot Inserts |
| 4. Serverless Connections    --> Connection Pool Exhaustion on Postgres Port 5432 |
| 5. Dashboard Status Counts   --> Heavy Table Scans on Aggregation Queries         |
+-----------------------------------------------------------------------------------+
```

### 1. `appointment_audit_events` Table Bloat & Write Saturation (Breaks First)
- **The Failure**: Because audit events are append-only and record every lifecycle event (slot created, booked, checked in, note added, provider assigned), this table will grow 5x to 10x faster than `appointments`. At 100x scale, this table will surpass 10,000,000 rows. PostgreSQL sequential scans, table VACUUM times, and backup durations will degrade drastically.
- **Engineering Fix**:
  - Implement **Declarative Table Partitioning** by timestamp (`PARTITION BY RANGE (created_at)`), splitting partitions monthly.
  - Offload historical audit partitions older than 1 year to cold storage (e.g. AWS S3 via Parquet or an analytical store like ClickHouse/BigQuery) while keeping recent months active in PostgreSQL.

### 2. GIN Trigram Indexes (`pg_trgm`) Consuming Server RAM
- **The Failure**: We currently use `pg_trgm` GIN indexes on `patients(full_name)` and `profiles(full_name)` for substring search (`ILIKE '%term%'`). Trigram indexes work brilliantly for clinic datasets up to tens of thousands of rows. But at 100x scale (hundreds of thousands of patient names), GIN trigram indexes become massive in size and must stay resident in RAM. As memory pressure rises, Postgres will swap index pages to disk, slowing name searches and stalling write throughput on patient creation.
- **Engineering Fix**:
  - Replace trigram substring searching with **PostgreSQL Full-Text Search** (`to_tsvector` with a prefix-matching B-Tree/GIN index), or
  - Offload search to a specialized external search engine (e.g. Meilisearch, Elasticsearch, or Algolia) syncing via change data capture (CDC).

### 3. GiST Index Memory Footprint on `appointments`
- **The Failure**: The `appointments_no_overlap` constraint relies on a GiST index over `provider_id` and `service_range`. GiST trees are significantly heavier to traverse and balance than standard B-Trees. As the table grows into millions of records, the GiST index will exceed Postgres `shared_buffers`, forcing disk I/O on every slot creation or booking attempt.
- **Engineering Fix**:
  - Notice that our constraint already includes a partial filter: `WHERE (archived_at IS NULL AND (patient_id IS NULL OR status IN ('requested', 'confirmed', 'checked_in')))`.
  - At 100x scale, we should enforce table archiving: move past/completed/cancelled appointments older than 60 days into an `appointments_history` archive table. This keeps the active scheduling working set tiny, ensuring the GiST index fits entirely in high-speed RAM.

### 4. Serverless Connection Pool Exhaustion
- **The Failure**: Next.js App Router runs server actions and route handlers on serverless/edge lambdas. Under heavy clinic load, hundreds of concurrent serverless instances will spin up and each establish direct TCP connections to PostgreSQL, quickly exceeding Postgres's `max_connections` limit (typically 100–300 connections) and throwing `FATAL: remaining connection slots are reserved`.
- **Engineering Fix**:
  - Route all database traffic through **PgBouncer** or Supabase Transaction Connection Pooling (`pool_mode = transaction` on port 6543) so thousands of serverless requests share a pool of 20–30 persistent database connections.

### 5. Real-Time Dashboard Aggregate Counters Slowing Down
- **The Failure**: The dashboard calculates real-time operational badges (e.g. appointments today, unconfirmed visits within 2 hours, checked-in counts). At 100x scale, running aggregate queries over large tables on every dashboard page load will degrade response times past 1 second.
- **Engineering Fix**:
  - Implement Redis caching with 30-second TTLs or Incremental Materialized Views (`REFRESH MATERIALIZED VIEW CONCURRENTLY`).
  - Cache provider lists and static daily schedules using Redis / Next.js `unstable_cache` with tag-based revalidation triggered on mutation.

---

## 6. Indexing & Query Strategy Summary

The active index footprint (`supabase/migrations/008_indexes.sql`) aligns directly with server-side query patterns:

```sql
-- Single-column B-tree lookups
CREATE INDEX appointments_provider_id_idx ON public.appointments (provider_id);
CREATE INDEX appointments_status_idx ON public.appointments (status);
CREATE INDEX appointments_scheduled_start_idx ON public.appointments (scheduled_start);
CREATE INDEX appointments_patient_id_idx ON public.appointments (patient_id);

-- Composite B-tree indexes for dashboard & calendar day range filtering
CREATE INDEX appointments_provider_start_idx ON public.appointments (provider_id, scheduled_start);
CREATE INDEX appointments_status_start_idx ON public.appointments (status, scheduled_start);

-- Care team & timeline navigation
CREATE INDEX appointment_supporting_providers_provider_id_idx ON public.appointment_supporting_providers (provider_id);
CREATE INDEX appointment_supporting_providers_appointment_id_idx ON public.appointment_supporting_providers (appointment_id);
CREATE INDEX visit_notes_appointment_created_idx ON public.visit_notes (appointment_id, created_at);
CREATE INDEX appointment_audit_events_appointment_created_idx ON public.appointment_audit_events (appointment_id, created_at);

-- GIN Trigram indexes for fast patient & provider substring search
CREATE INDEX patients_full_name_trgm_idx ON public.patients USING gin (full_name gin_trgm_ops);
CREATE INDEX profiles_full_name_trgm_idx ON public.profiles USING gin (full_name gin_trgm_ops);
```

This indexing setup ensures that provider calendar queries, patient visit timelines, and dashboard filters run as tight index scans with sub-millisecond query execution.