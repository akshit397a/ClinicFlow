import type {
  AppointmentListItem,
  AppointmentWithRelations,
  Profile,
  VisitNoteWithAuthor,
} from '@/lib/db/types';
import type { AppointmentsQueryInput } from '@/lib/validation/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildPage, getRange, type Page } from '@/lib/utils/pagination';
import { addDaysLocal, startOfDayLocal } from '@/lib/utils/dates';

const APPOINTMENT_SELECT =
  '*, patient:patients!appointments_patient_id_fkey(*), provider:profiles!appointments_provider_id_fkey(*)';

/** Escape PostgREST filter metacharacters so user input cannot break `.or()`. */
function escapeFilter(value: string): string {
  return value.replace(/[\\%,_]/g, (ch) => `\\${ch}`);
}

export async function listAppointments(
  input: AppointmentsQueryInput,
): Promise<Page<AppointmentListItem>> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT, { count: 'exact' });

  if (input.status === 'available') {
    query = query.is('patient_id', null);
  } else if (input.status) {
    query = query.eq('status', input.status);
  }

  if (input.providerId) {
    query = query.eq('provider_id', input.providerId);
  }

  if (input.search) {
    const escaped = escapeFilter(input.search);
    query = query.or(
      `patient.full_name.ilike.%${escaped}%,provider.full_name.ilike.%${escaped}%`,
    );
  }

  if (input.from) {
    query = query.gte('scheduled_start', input.from.toISOString());
  }
  if (input.to) {
    query = query.lte('scheduled_start', input.to.toISOString());
  }

  const { from, to } = getRange(input.page, input.pageSize);
  const ascending = input.sortDir === 'asc';

  query = query
    .order(input.sortBy, { ascending, nullsFirst: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to load appointments: ${error.message}`);
  }

  return buildPage(
    (data ?? []) as AppointmentListItem[],
    count ?? 0,
    input.page,
    input.pageSize,
  );
}

export async function getAppointment(
  id: string,
): Promise<AppointmentWithRelations | null> {
  const supabase = await createServerSupabaseClient();

  const [base, supportingRows, noteRows, auditRows] = await Promise.all([
    supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('appointment_supporting_providers')
      .select('provider:profiles!appointment_supporting_providers_provider_id_fkey(*)')
      .eq('appointment_id', id),
    supabase
      .from('visit_notes')
      .select('*, author:profiles!visit_notes_author_provider_id_fkey(*)')
      .eq('appointment_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('appointment_audit_events')
      .select(
        '*, actor:profiles!appointment_audit_events_actor_id_fkey(*), supporting_provider:profiles!appointment_audit_events_supporting_provider_id_fkey(*), note:visit_notes(*)',
      )
      .eq('appointment_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (base.error || !base.data) return null;

  const appointment = base.data as AppointmentWithRelations;
  appointment.supporting_providers = (supportingRows.data ?? []).map(
    (row) => (row as { provider: Profile }).provider,
  );
  appointment.visit_notes = (noteRows.data ?? []) as VisitNoteWithAuthor[];

  return appointment;
}

export async function getAppointmentsForPatient(
  patientId: string,
): Promise<AppointmentListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('patient_id', patientId)
    .order('scheduled_start', { ascending: false });

  if (error) {
    throw new Error(`Failed to load patient appointments: ${error.message}`);
  }

  return (data ?? []) as AppointmentListItem[];
}

export async function getDaySchedule(
  providerId: string,
  date: Date,
): Promise<AppointmentListItem[]> {
  const supabase = await createServerSupabaseClient();

  const dayStart = startOfDayLocal(date);
  const dayEnd = addDaysLocal(dayStart, 1);

  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('provider_id', providerId)
    .gte('scheduled_start', dayStart.toISOString())
    .lt('scheduled_start', dayEnd.toISOString())
    .is('archived_at', null)
    .order('scheduled_start', { ascending: true });

  if (error) {
    throw new Error(`Failed to load schedule: ${error.message}`);
  }

  return (data ?? []) as AppointmentListItem[];
}

