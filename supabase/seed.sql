-- seed.sql
-- Development/demo data. Applied by `supabase db reset` (runs as postgres,
-- bypassing RLS) or manually against a hosted project with a service role.
--
-- Users (password for every account: password123)
--   front_desk.one@clinic.test   Front Desk One   (front_desk)
--   front_desk.two@clinic.test   Front Desk Two   (front_desk)
--   provider.alice@clinic.test   Alice Smith      (provider)
--   provider.bob@clinic.test     Bob Nguyen       (provider)
--   provider.carol@clinic.test   Carol Gomez      (provider)

-- ---------------------------------------------------------------------------
-- Auth users (profiles are created automatically by the handle_new_user trigger)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated', 'authenticated', 'front_desk.one@clinic.test',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Front Desk One","role":"front_desk"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated', 'authenticated', 'front_desk.two@clinic.test',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Front Desk Two","role":"front_desk"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'provider.alice@clinic.test',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alice Smith","role":"provider"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'provider.bob@clinic.test',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Bob Nguyen","role":"provider"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'provider.carol@clinic.test',
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Carol Gomez","role":"provider"}',
    now(), now()
  );

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------
insert into public.patients (id, full_name, email, phone, date_of_birth) values
  ('10000000-0000-0000-0000-000000000001', 'Maya Rodriguez', 'maya.rodriguez@example.com',  '+1 555-0101', '1988-04-12'),
  ('10000000-0000-0000-0000-000000000002', 'James Chen',     'james.chen@example.com',      '+1 555-0102', '1992-11-03'),
  ('10000000-0000-0000-0000-000000000003', 'Priya Patel',    'priya.patel@example.com',     '+1 555-0103', '1975-02-27'),
  ('10000000-0000-0000-0000-000000000004', 'Liam O''Connor', 'liam.oconnor@example.com',    '+1 555-0104', '2001-07-19'),
  ('10000000-0000-0000-0000-000000000005', 'Sofia Martinez', 'sofia.martinez@example.com',  '+1 555-0105', '1984-09-30'),
  ('10000000-0000-0000-0000-000000000006', 'Ethan Brooks',   'ethan.brooks@example.com',    '+1 555-0106', '1997-01-22'),
  ('10000000-0000-0000-0000-000000000007', 'Amelia Foster',  'amelia.foster@example.com',   '+1 555-0107', '1969-12-08'),
  ('10000000-0000-0000-0000-000000000008', 'Noah Kim',       'noah.kim@example.com',        '+1 555-0108', '1990-06-15');

-- ---------------------------------------------------------------------------
-- Historical data: 8 weeks of completed / no-show appointments (no-show chart)
-- ---------------------------------------------------------------------------
-- For each of the last 8 weeks, each provider sees patients on Monday and
-- Wednesday at 09:00/10:00/11:00. Roughly every fourth visit is a no-show.
-- All rows are completed or no_show, which do not participate in the overlap
-- exclusion constraint, so the generated times cannot conflict.
insert into public.appointments (
  provider_id, patient_id, scheduled_start, duration_minutes, status, created_at
)
select
  pr.id,
  (array[
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000008'
  ]::uuid[])[((w.w * 6) + (d.d * 3) + s.s) % 8 + 1],
  date_trunc('week', now()) - interval '1 week'
    + (w.w - 1) * interval '1 week'
    + d.d * interval '2 days'
    + interval '9 hours'
    + s.s * interval '1 hour',
  30,
  case when ((w.w * 6) + (d.d * 3) + s.s) % 4 = 0 then 'no_show' else 'completed' end,
  date_trunc('week', now()) - interval '1 week'
    + (w.w - 1) * interval '1 week'
    + d.d * interval '2 days'
    + interval '9 hours'
    + s.s * interval '1 hour'
    - interval '2 days'
from public.profiles pr
cross join generate_series(1, 8) as w(w)
cross join generate_series(0, 1) as d(d)
cross join generate_series(0, 2) as s(s)
where pr.role = 'provider';

-- ---------------------------------------------------------------------------
-- Alice Smith -- today's schedule (fixed clock times, all non-overlapping)
--   08:00 completed, 08:30 completed, 09:00 completed
--   09:30 checked_in, 10:00 confirmed, 11:00 confirmed
--   12:00 requested (NOT dismissed -> shows as an unconfirmed alert)
--   13:00 requested (dismissed, more than an hour away -> alert suppressed)
--   15:00 + 16:00 available slots
-- ---------------------------------------------------------------------------
insert into public.appointments (
  provider_id, patient_id, scheduled_start, duration_minutes, status,
  alert_dismissed_at, alert_dismissed_by, created_at
) values
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000001',
   date_trunc('day', now()) + interval '8 hours',  30, 'completed', null, null, now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000002',
   date_trunc('day', now()) + interval '8 hours 30 minutes', 30, 'completed', null, null, now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000003',
   date_trunc('day', now()) + interval '9 hours', 30, 'completed', null, null, now() - interval '1 day'),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000004',
   date_trunc('day', now()) + interval '9 hours 30 minutes', 30, 'checked_in', null, null, now() - interval '1 day'),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000005',
   date_trunc('day', now()) + interval '10 hours', 30, 'confirmed', null, null, now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000006',
   date_trunc('day', now()) + interval '11 hours', 30, 'confirmed', null, null, now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000007',
   date_trunc('day', now()) + interval '12 hours', 30, 'requested', null, null, now() - interval '3 hours'),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000008',
   date_trunc('day', now()) + interval '13 hours', 30, 'requested', now(), '44444444-4444-4444-4444-444444444444', now() - interval '5 hours'),
  ('11111111-1111-1111-1111-111111111111', null,
   date_trunc('day', now()) + interval '15 hours', 30, null, null, null, now()),
  ('11111111-1111-1111-1111-111111111111', null,
   date_trunc('day', now()) + interval '16 hours', 30, null, null, null, now());

-- Alice, two days from now at 09:00: requested (more than 24h out -> no alert)
insert into public.appointments (
  provider_id, patient_id, scheduled_start, duration_minutes, status, created_at
) values (
  '11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000001',
  date_trunc('day', now()) + interval '2 days' + interval '9 hours', 30, 'requested', now()
);

-- Alice, yesterday at 14:00: requested but in the past (no alert)
insert into public.appointments (
  provider_id, patient_id, scheduled_start, duration_minutes, status, created_at
) values (
  '11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000002',
  date_trunc('day', now()) - interval '1 day' + interval '14 hours', 30, 'requested', now() - interval '3 days'
);

-- Alice, cancelled examples
insert into public.appointments (
  provider_id, patient_id, scheduled_start, duration_minutes, status, cancellation_reason, created_at
) values
  (
    '11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000004',
    date_trunc('day', now()) - interval '5 days' + interval '10 hours', 30, 'cancelled',
    'Patient asked to reschedule', now() - interval '6 days'
  ),
  (
    '11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000005',
    date_trunc('day', now()) + interval '3 days' + interval '12 hours', 30, 'cancelled',
    'Provider unavailable', now() - interval '1 day'
  );

-- ---------------------------------------------------------------------------
-- Bob Nguyen -- today (relative to now(), guaranteed non-overlapping)
--   completed 3h ago, confirmed +2h, requested +4h (dismissed -> suppressed),
--   available slot +5h
-- ---------------------------------------------------------------------------
insert into public.appointments (
  provider_id, patient_id, scheduled_start, duration_minutes, status,
  alert_dismissed_at, alert_dismissed_by, created_at
) values
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000001',
   now() - interval '3 hours', 30, 'completed', null, null, now() - interval '1 day'),
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000003',
   now() + interval '2 hours', 30, 'confirmed', null, null, now() - interval '1 day'),
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000004',
   now() + interval '4 hours', 30, 'requested', now(), '44444444-4444-4444-4444-444444444444', now() - interval '6 hours'),
  ('22222222-2222-2222-2222-222222222222', null,
   now() + interval '5 hours', 30, null, null, null, now());

-- ---------------------------------------------------------------------------
-- Carol Gomez -- today (relative to now(), guaranteed non-overlapping)
--   requested +40min (dismissed but inside the one-hour window -> alert REAPPEARS)
--   available slot +3h
-- ---------------------------------------------------------------------------
insert into public.appointments (
  provider_id, patient_id, scheduled_start, duration_minutes, status,
  alert_dismissed_at, alert_dismissed_by, created_at
) values
  ('33333333-3333-3333-3333-333333333333', '10000000-0000-0000-0000-000000000005',
   now() + interval '40 minutes', 30, 'requested', now(), '44444444-4444-4444-4444-444444444444', now() - interval '2 hours'),
  ('33333333-3333-3333-3333-333333333333', null,
   now() + interval '3 hours', 30, null, null, null, now());

-- ---------------------------------------------------------------------------
-- Future available slots: weekdays starting 3 days out, 09:00-15:00 on the hour
-- ---------------------------------------------------------------------------
insert into public.appointments (
  provider_id, scheduled_start, duration_minutes, created_at
)
select
  pr.id,
  date_trunc('day', now()) + interval '3 days'
    + d.d * interval '1 day'
    + t.t,
  30,
  now()
from public.profiles pr
cross join generate_series(0, 4) as d(d)
cross join (
  values
    (interval '9 hours'),
    (interval '10 hours'),
    (interval '11 hours'),
    (interval '13 hours'),
    (interval '14 hours'),
    (interval '15 hours')
) as t(t)
where pr.role = 'provider'
  and extract(isodow from date_trunc('day', now()) + interval '3 days' + d.d * interval '1 day') < 6;

-- ---------------------------------------------------------------------------
-- Supporting providers
-- Bob supports Alice's 09:30 checked-in visit; Carol supports Bob's confirmed
-- visit; Bob supports one of Alice's historical completed visits.
-- ---------------------------------------------------------------------------
insert into public.appointment_supporting_providers (appointment_id, provider_id, assigned_by, assigned_at)
select a.id, '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', now()
from public.appointments a
where a.provider_id = '11111111-1111-1111-1111-111111111111'
  and a.scheduled_start = date_trunc('day', now()) + interval '9 hours 30 minutes';

insert into public.appointment_supporting_providers (appointment_id, provider_id, assigned_by, assigned_at)
select a.id, '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', now()
from public.appointments a
where a.provider_id = '22222222-2222-2222-2222-222222222222'
  and a.status = 'confirmed';

insert into public.appointment_supporting_providers (appointment_id, provider_id, assigned_by, assigned_at)
select a.id, '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', now()
from public.appointments a
where a.provider_id = '11111111-1111-1111-1111-111111111111'
  and a.status = 'completed'
  and a.scheduled_start > now() - interval '8 weeks'
order by a.scheduled_start
limit 1;

-- ---------------------------------------------------------------------------
-- Visit notes
-- ---------------------------------------------------------------------------
insert into public.visit_notes (appointment_id, author_provider_id, content)
select a.id, '11111111-1111-1111-1111-111111111111',
  'Routine check-up. Blood pressure normal, all vitals within range.'
from public.appointments a
where a.provider_id = '11111111-1111-1111-1111-111111111111'
  and a.scheduled_start = date_trunc('day', now()) + interval '8 hours';

insert into public.visit_notes (appointment_id, author_provider_id, content)
select a.id, '11111111-1111-1111-1111-111111111111',
  'Follow-up for lab results. Medication dosage adjusted.'
from public.appointments a
where a.provider_id = '11111111-1111-1111-1111-111111111111'
  and a.scheduled_start = date_trunc('day', now()) + interval '8 hours 30 minutes';

insert into public.visit_notes (appointment_id, author_provider_id, content)
select a.id, '22222222-2222-2222-2222-222222222222',
  'Supporting provider present. Coordinated care plan with primary provider.'
from public.appointments a
where a.provider_id = '11111111-1111-1111-1111-111111111111'
  and a.scheduled_start = date_trunc('day', now()) + interval '9 hours 30 minutes';

insert into public.visit_notes (appointment_id, author_provider_id, content)
select a.id, '22222222-2222-2222-2222-222222222222',
  'Annual physical. Recommended routine screening.'
from public.appointments a
where a.provider_id = '22222222-2222-2222-2222-222222222222'
  and a.scheduled_start = now() - interval '3 hours';

insert into public.visit_notes (appointment_id, author_provider_id, content)
select a.id, '11111111-1111-1111-1111-111111111111',
  'Patient reported mild knee pain. Referred to specialist.'
from public.appointments a
where a.provider_id = '11111111-1111-1111-1111-111111111111'
  and a.status = 'completed'
  and a.scheduled_start > now() - interval '6 weeks'
order by a.scheduled_start
limit 1;

-- ---------------------------------------------------------------------------
-- Audit history (append-only; generated so every appointment has a timeline)
-- ---------------------------------------------------------------------------
-- Slots: SLOT_CREATED (actor = the provider whose schedule it is)
-- Bookings: STATUS_CHANGED from null to their final status (actor = front desk)
insert into public.appointment_audit_events (
  appointment_id, event_type, actor_id, old_status, new_status, created_at
)
select
  id,
  case when patient_id is null then 'SLOT_CREATED' else 'STATUS_CHANGED' end,
  case when patient_id is null then provider_id else '44444444-4444-4444-4444-444444444444' end,
  null,
  status,
  created_at
from public.appointments;

-- Intermediate transitions for appointments past the requested stage
insert into public.appointment_audit_events (
  appointment_id, event_type, actor_id, old_status, new_status, created_at
)
select id, 'STATUS_CHANGED', '44444444-4444-4444-4444-444444444444', 'requested', 'confirmed', created_at + interval '1 minute'
from public.appointments
where patient_id is not null
  and status in ('confirmed', 'checked_in', 'completed', 'no_show', 'cancelled');

insert into public.appointment_audit_events (
  appointment_id, event_type, actor_id, old_status, new_status, created_at
)
select id, 'STATUS_CHANGED', '44444444-4444-4444-4444-444444444444', 'confirmed', 'checked_in', created_at + interval '2 minutes'
from public.appointments
where status in ('checked_in', 'completed');

insert into public.appointment_audit_events (
  appointment_id, event_type, actor_id, old_status, new_status, created_at
)
select id, 'STATUS_CHANGED', '11111111-1111-1111-1111-111111111111', 'checked_in', 'completed', created_at + interval '3 minutes'
from public.appointments
where status = 'completed';

-- Cancellations
insert into public.appointment_audit_events (
  appointment_id, event_type, actor_id, old_status, new_status, cancellation_reason, created_at
)
select id, 'CANCELLED', '44444444-4444-4444-4444-444444444444', 'confirmed', 'cancelled', cancellation_reason, updated_at
from public.appointments
where status = 'cancelled';

-- Supporting-provider assignments
insert into public.appointment_audit_events (
  appointment_id, event_type, actor_id, supporting_provider_id, created_at
)
select appointment_id, 'SUPPORTING_PROVIDER_ADDED', assigned_by, provider_id, assigned_at
from public.appointment_supporting_providers;

-- Notes
insert into public.appointment_audit_events (
  appointment_id, event_type, actor_id, note_id, created_at
)
select appointment_id, 'NOTE_ADDED', author_provider_id, id, created_at
from public.visit_notes;