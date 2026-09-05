# ClinicFlow Database Schema & Architecture

## 1. Table-by-Table Storage Design

The database schema runs on PostgreSQL (via Supabase) and uses 6 core application tables alongside extensions (`pgcrypto`, `btree_gist`, `pg_trgm`).

### `profiles`

Maps **1:1** with Supabase `auth.users` to manage staff identity, credentials link, and clinic roles (`front_desk` vs `provider`).

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `PK`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Directly shares the auth UUID. |
| `email` | `text` | No | *None* | Synced from auth user record. |
| `full_name` | `text` | No | `''` | Display name for providers and front desk. |
| `role` | `text` | No | `CHECK (role IN ('front_desk', 'provider'))` | Restricts system access permissions. |
| `created_at` | `timestamptz` | No | `now()` | Audit creation timestamp. |
| `updated_at` | `timestamptz` | No | `now()` | Auto-updated via `set_updated_at()` trigger. |

> **Trigger Behavior:**
> When a new user is created in Supabase Auth, `on_auth_user_created` automatically inserts a corresponding row into `profiles`. The role defaults strictly to `'front_desk'` to prevent account self-elevation.

---

### `patients`

Stores patient demographic and contact records. Patients are **not** system users; they do not have auth credentials, passwords, or login access.

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `PK`, `default gen_random_uuid()` | Unique patient identifier. |
| `full_name` | `text` | No | *None* | Primary search target (trigram indexed). |
| `email` | `text` | Yes | *None* | Optional contact email. |
| `phone` | `text` | Yes | *None* | Optional phone number. |
| `date_of_birth` | `date` | Yes | *None* | Date of birth for clinical records. |
| `created_at` | `timestamptz` | No | `now()` | Record creation timestamp. |
| `updated_at` | `timestamptz` | No | `now()` | Auto-updated via trigger. |

---

### `appointments`

The central scheduling table. Instead of maintaining disjointed tables for availability slots and booked appointments, `appointments` acts as a **single unified scheduling entity**.

* **Available Slot:** `patient_id IS NULL AND status IS NULL`
* **Booked Visit:** `patient_id IS NOT NULL AND status IS NOT NULL`

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `PK`, `default gen_random_uuid()` | Primary key. |
| `provider_id` | `uuid` | No | `REFERENCES profiles(id) ON DELETE RESTRICT` | Primary doctor responsible for slot/visit. |
| `patient_id` | `uuid` | Yes | `REFERENCES patients(id) ON DELETE RESTRICT` | Null for open slot; populated on booking. |
| `scheduled_start` | `timestamptz` | No | *None* | Start time of slot/appointment. |
| `duration_minutes` | `integer` | No | `CHECK (duration_minutes > 0)` | Standard 15, 30, 45, or 60 min slots. |
| `service_range` | `tstzrange` | No | `GENERATED ALWAYS AS (...) STORED` | `[start, end)` range for GiST overlap check. |
| `status` | `text` | Yes | `CHECK (status IN ('requested', ...))` | Clinical encounter lifecycle status. |
| `cancellation_reason` | `text` | Yes | *None* | Mandatory when `status = 'cancelled'`. |
| `archived_at` | `timestamptz` | Yes | *None* | Soft-deletion timestamp for open slots. |
| `archived_by` | `uuid` | Yes | `REFERENCES profiles(id) ON DELETE SET NULL` | Staff member who removed the slot. |
| `alert_dismissed_at` | `timestamptz` | Yes | *None* | Timestamp when 2h alert was dismissed. |
| `alert_dismissed_by` | `uuid` | Yes | `REFERENCES profiles(id) ON DELETE SET NULL` | Staff member who acknowledged alert. |
| `created_at` | `timestamptz` | No | `now()` | Record creation timestamp. |
| `updated_at` | `timestamptz` | No | `now()` | Auto-updated via trigger. |

---

### `appointment_supporting_providers`

Join table representing assisting care team members (e.g., surgeons, residents, nurses).

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| --- | --- | --- | --- | --- |
| `appointment_id` | `uuid` | No | `REFERENCES appointments(id) ON DELETE CASCADE` | Part 1 of Composite PK. |
| `provider_id` | `uuid` | No | `REFERENCES profiles(id) ON DELETE CASCADE` | Part 2 of Composite PK. |
| `assigned_by` | `uuid` | No | `REFERENCES profiles(id) ON DELETE SET NULL` | Staff member who assigned this provider. |
| `assigned_at` | `timestamptz` | No | `now()` | Assignment timestamp. |

> **Primary Key:** `(appointment_id, provider_id)`
> Guarantees duplicate care-team assignments are rejected at the database engine level.

---

### `visit_notes`

Encounter consultation notes recorded by providers.

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `PK`, `default gen_random_uuid()` | Note identifier. |
| `appointment_id` | `uuid` | No | `REFERENCES appointments(id) ON DELETE CASCADE` | Associated appointment. |
| `author_provider_id` | `uuid` | No | `REFERENCES profiles(id) ON DELETE RESTRICT` | Author; `RESTRICT` preserves record history. |
| `content` | `text` | No | `CHECK (length(trim(content)) > 0)` | Clinical body; cannot be empty/whitespace. |
| `created_at` | `timestamptz` | No | `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | No | `now()` | Auto-updated via trigger. |

---

### `appointment_audit_events`

Append-only legal audit log. Public and authenticated users have **zero** `UPDATE` or `DELETE` permissions.

| Column | Type | Nullable | Default / Constraints | Developer Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `PK`, `default gen_random_uuid()` | Audit event ID. |
| `appointment_id` | `uuid` | No | `REFERENCES appointments(id) ON DELETE RESTRICT` | Target appointment reference. |
| `event_type` | `text` | No | `CHECK (event_type IN (...))` | Explicit event categorization. |
| `actor_id` | `uuid` | Yes | `REFERENCES profiles(id) ON DELETE SET NULL` | User who triggered the event. |
| `old_status` | `text` | Yes | *None* | Pre-transition status. |
| `new_status` | `text` | Yes | *None* | Post-transition status. |
| `supporting_provider_id` | `uuid` | Yes | `REFERENCES profiles(id) ON DELETE SET NULL` | Care team member referenced. |
| `cancellation_reason` | `text` | Yes | *None* | Reason captured during cancellation. |
| `note_id` | `uuid` | Yes | `REFERENCES visit_notes(id) ON DELETE SET NULL` | Associated note reference. |
| `metadata` | `jsonb` | Yes | *None* | Snapshot context (names, IPs, state). |
| `created_at` | `timestamptz` | No | `now()` | Immutable timestamp of event. |

---

## 2. Entity Relationships
                     +-------------------+
                     |      profiles     |
                     +-------------------+
                       /       |       \
               (1:N)  /        |        \  (1:N)
                     v         | (N:M)   v
     +------------------+      |      +---------------------+
     |   appointments   | <----+----> | supporting_providers|
     +------------------+             +---------------------+
       /       |      \
 (1:N)/   (1:N)|       \(1:N)
     v         v        v
+----------+ +-------+ +------------------+
| patients | | notes | |   audit_events   |
+----------+ +-------+ +------------------+

### One-to-Many ($1:N$)

* **`profiles` (Provider) $\rightarrow$ `appointments**`: `appointments.provider_id` (`ON DELETE RESTRICT`)
* **`patients` $\rightarrow$ `appointments**`: `appointments.patient_id` (`ON DELETE RESTRICT`)
* **`appointments` $\rightarrow$ `visit_notes**`: `visit_notes.appointment_id` (`ON DELETE CASCADE`)
* **`profiles` (Author) $\rightarrow$ `visit_notes**`: `visit_notes.author_provider_id` (`ON DELETE RESTRICT`)
* **`appointments` $\rightarrow$ `appointment_audit_events**`: `appointment_audit_events.appointment_id` (`ON DELETE RESTRICT`)
* **`profiles` (Actor) $\rightarrow$ `appointment_audit_events**`: `appointment_audit_events.actor_id` (`ON DELETE SET NULL`)

### Many-to-Many ($N:M$)

* **`appointments` $\longleftrightarrow$ `profiles**`: Connected via `appointment_supporting_providers`. Primary key `(appointment_id, provider_id)` enforces uniqueness.

---

## 3. Constraint Boundaries & Application Responsibility

> **Architectural Motto:** "The database protects physical integrity, concurrency invariants, and relational validity; application code orchestrates temporal workflows, contextual permissions, and user feedback."

| Feature | Enforcement Layer | Implementation Mechanism | Rationale |
| --- | --- | --- | --- |
| **No Double Booking** | **Database** | `EXCLUDE USING gist (provider_id WITH =, service_range WITH &&)` | Atomically blocks race conditions during concurrent bookings. |
| **Slot/Appointment Integrity** | **Database** | `CHECK ((patient_id IS NULL AND status IS NULL) OR ...)` | Prevents illegal hybrid states (e.g., patient assigned without status). |
| **Cancellation Justification** | **Database** | `CHECK (cancellation_reason IS NOT NULL OR status != 'cancelled')` | Guarantees compliance records are never saved blank. |
| **Non-Empty Clinical Notes** | **Database** | `CHECK (length(trim(content)) > 0)` | Protects clinical documentation standards. |
| **Audit Trail Safeguards** | **Database** | Supabase RLS policies | Disables `INSERT`, `UPDATE`, and `DELETE` actions for public clients. |
| **Temporal Workflow Rules** | **Application** | TypeScript Server Actions (`scheduled_start <= now()`) | Database checks cannot evaluate non-immutable dynamic calls like `now()`. |
| **Booking in Past** | **Application** | Zod Schema Validation | Instant UI feedback before hitting database engine boundaries. |
| **Role Permissions (RBAC)** | **Application** | Next.js Server Guards (`requireRole`, `requireAuth`) | Enforces role-based action scope before execution. |
| **Note Authorship Lockdown** | **Application** | Action authorization checks | Ensures providers can only modify notes they created. |

---

## 4. Intentional Denormalization Choices

1. **`service_range` Stored Column (`appointments`)**
*Reasoning:* PostgreSQL GiST exclusion indexes cannot process dynamic functions efficiently without stored expressions. Pre-computing `service_range` delivers index-scan speed on conflict queries.
2. **Direct `author_provider_id` (`visit_notes`)**
*Reasoning:* Prevents loss of authorship metadata if an appointment's primary provider is reassigned after care was delivered.
3. **Snapshot Fields & JSONB (`appointment_audit_events`)**
*Reasoning:* Real-world compliance audit trails must maintain immutable state snapshots regardless of future profile or patient modifications.
4. **Unified Polymorphic `appointments` Table**
*Reasoning:* Avoids dangerous two-phase distributed transactions between separate "slot" and "booking" tables, reducing double-booking risk.

---

## 5. 100x Scale Bottlenecks & Strategic Mitigations

```
+-----------------------------------------------------------------------------------+
|                            100x SCALE BOTTLENECK ANALYSIS                         |
+-----------------------------------------------------------------------------------+
| 1. appointment_audit_events  --> Table Bloat & Write Saturation (Millions of rows)|
| 2. pg_trgm (Name Search)     --> RAM Exhaustion on In-Memory GIN Trigram Indexes  |
| 3. GiST Exclusion Index      --> Buffer Pool Cache Eviction & Slower Slot Inserts |
| 4. Serverless Connections    --> Connection Pool Exhaustion on Postgres Port 5432 |
| 5. Dashboard Status Counts   --> Heavy Table Scans on Aggregation Queries         |
+-----------------------------------------------------------------------------------+

```

### 1. `appointment_audit_events` Table Bloat

* **Issue:** Grows 5–10× faster than main tables, degrading `VACUUM` execution and backup speeds.
* **Fix:** Apply **Declarative Range Partitioning** (`PARTITION BY RANGE (created_at)`). Move records older than 1 year to cold storage (S3 / Parquet / ClickHouse).

### 2. GIN Trigram Index Memory Pressure

* **Issue:** Large `full_name` indices require excessive RAM, driving disk swapping during high write traffic.
* **Fix:** Transition to **PostgreSQL Full-Text Search** (`to_tsvector`) or offload search tasks to an external engine (Meilisearch/Elasticsearch) using CDC.

### 3. GiST Overlap Index Cache Eviction

* **Issue:** Traversal overhead exceeds `shared_buffers`, forcing disk I/O calls for slot creation.
* **Fix:** Archive completed or cancelled appointments older than 60 days into an `appointments_history` table to keep the index active set small.

### 4. Serverless Database Connection Limits

* **Issue:** Lambda scaling spikes exhaust standard PostgreSQL TCP limits (`max_connections`).
* **Fix:** Route connection traffic through **PgBouncer** or Supabase Transaction Pooling (`pool_mode = transaction`).

### 5. Slow Dashboard Aggregate Queries

* **Issue:** Calculating real-time status counts across large dataset volumes creates execution bottlenecks.
* **Fix:** Utilize Redis caching strategies alongside Next.js `unstable_cache` tag revalidation for key metrics.

---

## 6. Indexing Footprint

Excerpt from active index configuration (`supabase/migrations/008_indexes.sql`):

```sql
-- Single-column B-tree lookups
CREATE INDEX appointments_provider_id_idx ON public.appointments (provider_id);
CREATE INDEX appointments_status_idx ON public.appointments (status);
CREATE INDEX appointments_scheduled_start_idx ON public.appointments (scheduled_start);
CREATE INDEX appointments_patient_id_idx ON public.appointments (patient_id);

-- Composite B-tree indexes for calendar & dashboard range filtering
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