-- 007_audit.sql
-- Append-only audit timeline for appointments. Rows are only ever inserted; the
-- application has no update/delete path for this table and RLS grants no write
-- access to authenticated users (see 009_rls.sql), so history cannot be edited
-- or deleted through the application.

create table public.appointment_audit_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete restrict,
  event_type text not null check (event_type in (
    'STATUS_CHANGED',
    'SUPPORTING_PROVIDER_ADDED',
    'SUPPORTING_PROVIDER_REMOVED',
    'CANCELLED',
    'NOTE_ADDED',
    'SLOT_CREATED',
    'SLOT_ARCHIVED'
  )),
  actor_id uuid references public.profiles (id) on delete set null,
  old_status text,
  new_status text,
  supporting_provider_id uuid references public.profiles (id) on delete set null,
  cancellation_reason text,
  note_id uuid references public.visit_notes (id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);