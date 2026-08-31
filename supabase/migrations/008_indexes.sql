-- 008_indexes.sql
-- Indexes for the server-side access patterns:
--   * appointment list/search/filter/sort/pagination
--   * schedule per provider per day
--   * dashboard aggregations
--   * patient/provider name search (pg_trgm + ILIKE)
--
-- Search trade-off: names are matched with ILIKE '%...%' backed by a GIN
-- trigram index. Trigram matching supports substring search ("smith" matching
-- "Sarah Smithson") and is fast enough for clinic-sized datasets, with no
-- external search engine required. Plain FTS (to_tsvector) is better at ranking
-- whole words but cannot do prefix/substring matching well, which is what name
-- search needs.

create index appointments_provider_id_idx
  on public.appointments (provider_id);

create index appointments_status_idx
  on public.appointments (status);

create index appointments_scheduled_start_idx
  on public.appointments (scheduled_start);

create index appointments_provider_start_idx
  on public.appointments (provider_id, scheduled_start);

create index appointments_status_start_idx
  on public.appointments (status, scheduled_start);

create index appointments_patient_id_idx
  on public.appointments (patient_id);

create index appointment_supporting_providers_provider_id_idx
  on public.appointment_supporting_providers (provider_id);

create index appointment_supporting_providers_appointment_id_idx
  on public.appointment_supporting_providers (appointment_id);

create index visit_notes_appointment_created_idx
  on public.visit_notes (appointment_id, created_at);

create index appointment_audit_events_appointment_created_idx
  on public.appointment_audit_events (appointment_id, created_at);

create index patients_full_name_trgm_idx
  on public.patients using gin (full_name gin_trgm_ops);

create index profiles_full_name_trgm_idx
  on public.profiles using gin (full_name gin_trgm_ops);