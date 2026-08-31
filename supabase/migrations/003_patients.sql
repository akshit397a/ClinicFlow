-- 003_patients.sql
-- Patients are NOT application users. They are created and managed by front-desk
-- staff only.

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();