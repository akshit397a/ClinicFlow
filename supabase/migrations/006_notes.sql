-- 006_notes.sql
-- Provider visit notes. Every note belongs to exactly one appointment. The
-- author is preserved permanently: author_provider_id is NOT NULL and cannot be
-- rewritten by the application, and profile deletion is restricted so history
-- is never lost.

create table public.visit_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  author_provider_id uuid not null references public.profiles (id) on delete restrict,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger visit_notes_set_updated_at
  before update on public.visit_notes
  for each row execute function public.set_updated_at();