import type { AuditEventWithActor } from '@/lib/db/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** Immutable audit timeline for one appointment, oldest first. Read-only. */
export async function getAppointmentAudit(
  appointmentId: string,
): Promise<AuditEventWithActor[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('appointment_audit_events')
    .select(
      '*, actor:profiles!appointment_audit_events_actor_id_fkey(*), supporting_provider:profiles!appointment_audit_events_supporting_provider_id_fkey(*), note:visit_notes(*)',
    )
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load appointment history: ${error.message}`);
  }

  return (data ?? []) as AuditEventWithActor[];
}