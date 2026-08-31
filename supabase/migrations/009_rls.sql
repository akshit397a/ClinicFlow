-- 009_rls.sql
-- Row Level Security strategy.
--
-- Reads:   all queries go through the authenticated user's session, so
--          authenticated users are granted SELECT on every application table.
--          The whole staff (front desk + providers) needs to see the shared
--          clinic schedule, patients, notes, etc.
--
-- Writes:  NO write policies exist for authenticated users. Every mutation is
--          performed by trusted server-side code (Next.js Server Actions) using
--          the service role, which bypasses RLS, after explicit application-
--          layer authorization (identity + role + ownership checks).
--
-- Consequence: a client that manipulates the request can never write directly
-- to the database -- not even to appointment_audit_events -- so audit history
-- cannot be forged through the public API.

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_supporting_providers enable row level security;
alter table public.visit_notes enable row level security;
alter table public.appointment_audit_events enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

create policy "patients_select_authenticated"
  on public.patients for select to authenticated using (true);

create policy "appointments_select_authenticated"
  on public.appointments for select to authenticated using (true);

create policy "appointment_supporting_providers_select_authenticated"
  on public.appointment_supporting_providers for select to authenticated using (true);

create policy "visit_notes_select_authenticated"
  on public.visit_notes for select to authenticated using (true);

create policy "appointment_audit_events_select_authenticated"
  on public.appointment_audit_events for select to authenticated using (true);