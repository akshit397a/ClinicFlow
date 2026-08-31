-- 004_appointments.sql
-- ONE scheduling entity for both an available slot and a booked appointment.
--
-- Interpretation:
--   patient_id IS NULL AND status IS NULL  -> available slot
--   patient_id IS NOT NULL AND status IS NOT NULL -> booked appointment
--
-- There is deliberately no "available" status; availability is the absence of a
-- patient and a status.

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete restrict,
  patient_id uuid references public.patients (id) on delete restrict,
  scheduled_start timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status text check (
    status in ('requested', 'confirmed', 'checked_in', 'completed', 'no_show', 'cancelled')
  ),
  cancellation_reason text,
  archived_at timestamptz,
  archived_by uuid references public.profiles (id) on delete set null,
  alert_dismissed_at timestamptz,
  alert_dismissed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A row is either an available slot or a booked appointment, never mixed.
  constraint appointments_slot_or_appointment check (
    (patient_id is null and status is null)
    or
    (patient_id is not null and status is not null)
  ),

  -- A cancellation must always carry a reason.
  constraint appointments_cancelled_requires_reason check (
    cancellation_reason is not null or status is distinct from 'cancelled'
  )
);

-- Derived half-open interval [scheduled_start, scheduled_start + duration).
-- Used by the overlap exclusion constraint below.
alter table public.appointments
  add column service_range tstzrange
  generated always as (
    tstzrange(scheduled_start, scheduled_start + (duration_minutes * interval '1 minute'))
  ) stored;

-- Concurrency-safe protection against overlapping slots/appointments for the
-- same provider. This is a database exclusion constraint (not a
-- query-then-insert pattern), so two concurrent inserts that overlap cannot both
-- succeed -- PostgreSQL enforces it atomically, including within a single
-- multi-row INSERT.
--
-- Only "active" records block time:
--   * available slots (patient_id IS NULL)
--   * appointments in requested / confirmed / checked_in
-- Completed, no-show and cancelled records have released the time (or the time
-- has passed) and therefore do not conflict with new bookings. Archived rows do
-- not block either.
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    provider_id with =,
    service_range with &&
  ) where (
    archived_at is null
    and (
      patient_id is null
      or status in ('requested', 'confirmed', 'checked_in')
    )
  );

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();