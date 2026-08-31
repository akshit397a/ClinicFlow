-- 002_profiles.sql
-- Application users. One row per auth.users entry; auth users are created by
-- Supabase Auth. Passwords are never stored in this table (or anywhere in our
-- schema) -- they live only in auth.users.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null check (role in ('front_desk', 'provider')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application user profile. One row per auth.users row. Role is front_desk or provider.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatically create a profile when a new auth user is created (sign-up or seed).
-- raw_user_meta_data.role defaults to 'front_desk' so a stray sign-up can never
-- self-grant provider privileges.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'front_desk')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();