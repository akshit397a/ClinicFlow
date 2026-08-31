import { addHours } from 'date-fns';
import type { AppointmentListItem, AppointmentStatus } from '@/lib/db/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ALERT_WINDOW_HOURS = 24;
const REAPPEAR_HOURS = 1;

export interface AlertCandidate {
  status: AppointmentStatus | null;
  scheduled_start: string;
  alert_dismissed_at: string | null;
}

/**
 * The unconfirmed-appointment alert rule, derived purely from time:
 *
 *   status = requested
 *   AND scheduled time is in the future
 *   AND within the next 24 hours
 *   AND NOT dismissed  -- unless the appointment is within 1 hour of its start,
 *                        in which case it reappears regardless of dismissal.
 *
 * Time-derived on purpose: no background job resets a dismissal flag.
 */
export function isUnconfirmedAlert(
  candidate: AlertCandidate,
  now: Date = new Date(),
): boolean {
  if (candidate.status !== 'requested') return false;

  const start = new Date(candidate.scheduled_start);
  const minutesUntil = Math.round((start.getTime() - now.getTime()) / 60000);
  if (minutesUntil <= 0) return false;
  if (minutesUntil > ALERT_WINDOW_HOURS * 60) return false;

  if (candidate.alert_dismissed_at && minutesUntil > REAPPEAR_HOURS * 60) {
    return false;
  }

  return true;
}

export async function getUnconfirmedAlerts(): Promise<AppointmentListItem[]> {
  const supabase = await createServerSupabaseClient();
  const now = new Date();

  const { data, error } = await supabase
    .from('appointments')
    .select(
      '*, patient:patients!appointments_patient_id_fkey(*), provider:profiles!appointments_provider_id_fkey(*)',
    )
    .eq('status', 'requested')
    .gt('scheduled_start', now.toISOString())
    .lte('scheduled_start', addHours(now, ALERT_WINDOW_HOURS).toISOString())
    .or(
      `alert_dismissed_at.is.null,scheduled_start.lte.${addHours(now, REAPPEAR_HOURS).toISOString()}`,
    )
    .order('scheduled_start', { ascending: true });

  if (error) {
    throw new Error(`Failed to load alerts: ${error.message}`);
  }

  return (data ?? []) as AppointmentListItem[];
}

export async function countUnconfirmedAlerts(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const now = new Date();

  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'requested')
    .gt('scheduled_start', now.toISOString())
    .lte('scheduled_start', addHours(now, ALERT_WINDOW_HOURS).toISOString())
    .or(
      `alert_dismissed_at.is.null,scheduled_start.lte.${addHours(now, REAPPEAR_HOURS).toISOString()}`,
    );

  if (error) {
    throw new Error(`Failed to count alerts: ${error.message}`);
  }

  return count ?? 0;
}