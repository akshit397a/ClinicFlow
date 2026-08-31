-- 005_care_team.sql
-- Supporting providers on an appointment. A many-to-many relationship with a
-- composite primary key, which prevents duplicate assignments at the database
-- level.

create table public.appointment_supporting_providers (
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid not null references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (appointment_id, provider_id)
);