import { prisma } from '@/lib/prisma';
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

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  await prisma.appointmentAuditEvent.create({
    data: {
      appointmentId: input.appointmentId,
      eventType: input.eventType,
      actorId: input.actorId ?? null,
      oldStatus: input.oldStatus ?? null,
      newStatus: input.newStatus ?? null,
      supportingProviderId: input.supportingProviderId ?? null,
      cancellationReason: input.cancellationReason ?? null,
      noteId: input.noteId ?? null,
      metadata: input.metadata as any ?? null,
    },
  });
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

export function recordSlotRestored(input: {
  appointmentId: string;
  actorId: string;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'SLOT_RESTORED',
    actorId: input.actorId,
  });
}

export function recordSlotEdited(input: {
  appointmentId: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'SLOT_EDITED',
    actorId: input.actorId,
    metadata: input.metadata,
  });
}

export function recordNoteEdited(input: {
  appointmentId: string;
  actorId: string;
  noteId: string;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'NOTE_EDITED',
    actorId: input.actorId,
    noteId: input.noteId,
  });
}

export function recordProviderReassigned(input: {
  appointmentId: string;
  actorId: string;
  oldProviderId: string;
  newProviderId: string;
}): Promise<void> {
  return recordAuditEvent({
    appointmentId: input.appointmentId,
    eventType: 'PROVIDER_REASSIGNED',
    actorId: input.actorId,
    supportingProviderId: input.newProviderId,
    metadata: {
      oldProviderId: input.oldProviderId,
      newProviderId: input.newProviderId,
    },
  });
}