import type { AppointmentListItem } from '@/lib/db/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SCHEDULE_SELECT =
  '*, patient:patients!appointments_patient_id_fkey(*), provider:profiles!appointments_provider_id_fkey(*)';

/**
 * Available slots (patient_id IS NULL, status IS NULL, not archived) for one
 * provider in a time range.
 */
export async function getProviderSlots(
  providerId: string,
  from: Date,
  to: Date,
): Promise<AppointmentListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('appointments')
    .select(SCHEDULE_SELECT)
    .eq('provider_id', providerId)
    .is('patient_id', null)
    .is('status', null)
    .is('archived_at', null)
    .gte('scheduled_start', from.toISOString())
    .lt('scheduled_start', to.toISOString())
    .order('scheduled_start', { ascending: true });

  if (error) {
    throw new Error(`Failed to load availability: ${error.message}`);
  }

  return (data ?? []) as AppointmentListItem[];
}