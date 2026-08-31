import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditEventType } from '@/lib/db/types';

export interface AuditEventInput {
  appointmentId: string;
  eventType: AuditEventType;
  actorId?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  supportingProviderId?: string | null;
  cancellationReason?: string | null;
  noteId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Appends one immutable audit event. Runs through the trusted admin client; the
 * public API has no write access to appointment_audit_events, so history cannot
 * be forged from a client.
 *
 * Assumption: the audit insert happens immediately after the mutation it
 * describes. It is not transactional with it; if the process dies between the
 * two calls, the event could be lost. For this application the trade-off is
 * acceptable and keeps audit logic readable in one place (see docs/decisions.md).
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('appointment_audit_events').insert({
    appointment_id: input.appointmentId,
    event_type: input.eventType,
    actor_id: input.actorId ?? null,
    old_status: input.oldStatus ?? null,
    new_status: input.newStatus ?? null,
    supporting_provider_id: input.supportingProviderId ?? null,
    cancellation_reason: input.cancellationReason ?? null,
    note_id: input.noteId ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    throw new Error(`Failed to record audit event: ${error.message}`);
  }
}

export function recordStatusChanged(input: {
  appointmentId: string;
  actorId: string;
  oldStatus: string | null;
  newStatus: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'STATUS_CHANGED',
    actorId: input.actorId,
    oldStatus: input.oldStatus,
    newStatus: input.newStatus,
    metadata: input.metadata,
  });
}

export function recordCancelled(input: {
  appointmentId: string;
  actorId: string;
  oldStatus: string;
  cancellationReason: string;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'CANCELLED',
    actorId: input.actorId,
    oldStatus: input.oldStatus,
    newStatus: 'cancelled',
    cancellationReason: input.cancellationReason,
  });
}

export function recordNoteAdded(input: {
  appointmentId: string;
  actorId: string;
  noteId: string;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'NOTE_ADDED',
    actorId: input.actorId,
    noteId: input.noteId,
  });
}

export function recordSupportingProviderAdded(input: {
  appointmentId: string;
  actorId: string;
  providerId: string;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'SUPPORTING_PROVIDER_ADDED',
    actorId: input.actorId,
    supportingProviderId: input.providerId,
  });
}

export function recordSupportingProviderRemoved(input: {
  appointmentId: string;
  actorId: string;
  providerId: string;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'SUPPORTING_PROVIDER_REMOVED',
    actorId: input.actorId,
    supportingProviderId: input.providerId,
  });
}

export function recordSlotCreated(input: {
  appointmentId: string;
  actorId: string;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'SLOT_CREATED',
    actorId: input.actorId,
  });
}

export function recordSlotArchived(input: {
  appointmentId: string;
  actorId: string;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'SLOT_ARCHIVED',
    actorId: input.actorId,
  });
}