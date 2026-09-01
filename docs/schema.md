# Database schema

One scheduling entity (`appointments`) represents **both** an available slot and
a booked appointment. There is no separate `availability_slots` table and no
"available" status.

## Tables

### profiles
One row per `auth.users` user (created by trigger `handle_new_user`).

| column       | type      | notes                                        |
|--------------|-----------|----------------------------------------------|
| id           | uuid PK   | = auth.users.id                              |
| email        | text      |                                              |
| full_name    | text      |                                              |
| role         | text      | `front_desk` \| `provider` (CHECK)           |
| created_at   | timestamptz |                                            |
| updated_at   | timestamptz |                                            |

### patients
Patients are **not** application users.

| column        | type      | notes                            |
|---------------|-----------|----------------------------------|
| id            | uuid PK   |                                  |
| full_name     | text      |                                  |
| email         | text?     |                                  |
| phone         | text?     |                                  |
| date_of_birth | date?     |                                  |
| created_at, updated_at | timestamptz |                      |

### appointments

| column                | type        | notes                                      |
|-----------------------|-------------|--------------------------------------------|
| id                    | uuid PK     |                                            |
| provider_id           | uuid FK profiles | on delete restrict                     |
| patient_id            | uuid? FK patients | on delete restrict                    |
| scheduled_start       | timestamptz |                                            |
| duration_minutes      | int         | CHECK > 0                                 |
| status                | text?       | CHECK in (requested, confirmed, checked_in, completed, no_show, cancelled) |
| cancellation_reason   | text?       | CHECK: not null when status = cancelled   |
| archived_at/by        | timestamptz? / uuid? | soft-removal of availability slots  |
| alert_dismissed_at/by | timestamptz? / uuid? | unconfirmed-alert dismissal state    |
| created_at, updated_at | timestamptz |                                            |
| service_range         | tstzrange   | GENERATED = [scheduled_start, +duration)  |
| constraint slot_or_appointment | CHECK (patient & status both NULL, or both set) |
| constraint no_overlap | EXCLUDE USING gist (provider_id =, service_range &&) WHERE archived_at IS NULL AND (patient_id IS NULL OR status IN (requested, confirmed, checked_in)) |

**Interpretation**: `patient_id IS NULL AND status IS NULL` = available slot.
Booking a slot populates `patient_id` and sets `status = 'requested'`.

The exclusion constraint is the concurrency-safe overlap guard: two active
records for the same provider cannot overlap `[start, end)`. Completed,
no-show, cancelled, and archived rows release the time.

### appointment_supporting_providers
Many-to-many supporting providers.

| column         | type      | notes                          |
|----------------|-----------|--------------------------------|
| appointment_id | uuid FK   | PK (composite)                 |
| provider_id    | uuid FK   | PK (composite) → no duplicates |
| assigned_by    | uuid FK   |                                |
| assigned_at    | timestamptz |                              |

### visit_notes

| column            | type      | notes                                     |
|-------------------|-----------|-------------------------------------------|
| id                | uuid PK   |                                           |
| appointment_id    | uuid FK   | every note belongs to one appointment     |
| author_provider_id| uuid FK on delete restrict | preserved permanently        |
| content           | text      | CHECK non-empty                           |
| created_at, updated_at | timestamptz |                                   |

### appointment_audit_events
Append-only. No UPDATE/DELETE policy exists for authenticated users and the app
never issues them, so history cannot be edited or deleted through the
application.

| column                 | type      | notes                                       |
|------------------------|-----------|---------------------------------------------|
| id                     | uuid PK   |                                             |
| appointment_id         | uuid FK on delete restrict | prevents deleting appointments with history |
| event_type             | text      | CHECK in (STATUS_CHANGED, SUPPORTING_PROVIDER_ADDED, SUPPORTING_PROVIDER_REMOVED, CANCELLED, NOTE_ADDED, SLOT_CREATED, SLOT_ARCHIVED) |
| actor_id               | uuid? FK  | the user who performed the action           |
| old_status / new_status | text?    |                                             |
| supporting_provider_id | uuid? FK  |                                             |
| cancellation_reason    | text?     |                                             |
| note_id                | uuid? FK  | for NOTE_ADDED                              |
| metadata              | jsonb?     |                                             |
| created_at             | timestamptz |                                           |

## Indexes (008_indexes.sql)

- `appointments(provider_id)`, `(status)`, `(scheduled_start)`,
  `(provider_id, scheduled_start)`, `(status, scheduled_start)`, `(patient_id)`
- `appointment_supporting_providers(provider_id)`, `(appointment_id)`
- `visit_notes(appointment_id, created_at)`
- `appointment_audit_events(appointment_id, created_at)`
- `patients(full_name)` and `profiles(full_name)` as **GIN trigram** indexes
  for `ILIKE '%...%'` name search.

## Search strategy

Patient/provider name search runs server-side with `ILIKE '%term%'` backed by
`pg_trgm` GIN indexes. Trade-off: trigram matching handles substring searches
("smith" matches "Sarah Smithson") with no external search engine, which is what
clinic name search needs; ranking is not as good as full-text search
(`to_tsvector`), which we do not need here.

## RLS (009_rls.sql)

Enabled on every table. Policies grant **SELECT to `authenticated`** only. There
are **no INSERT/UPDATE/DELETE policies** — all writes flow through the trusted
service-role client after application-layer authorization. Consequence: the
public API cannot mutate any table, including the audit table.