import type { AuditEventWithActor } from '@/lib/db/types';
import { prisma } from '@/lib/prisma';

export async function getAppointmentAudit(
  appointmentId: string,
): Promise<AuditEventWithActor[]> {
  const rows = await prisma.appointmentAuditEvent.findMany({
    where: { appointmentId },
    include: {
      actor: true,
      supportingProvider: true,
      note: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((r) => ({
    id: r.id,
    appointment_id: r.appointmentId,
    event_type: r.eventType as any,
    actor_id: r.actorId,
    old_status: r.oldStatus,
    new_status: r.newStatus,
    supporting_provider_id: r.supportingProviderId,
    cancellation_reason: r.cancellationReason,
    note_id: r.noteId,
    metadata: r.metadata,
    created_at: r.createdAt.toISOString(),
    actor: r.actor
      ? {
          id: r.actor.id,
          email: r.actor.email,
          full_name: r.actor.fullName,
          role: r.actor.role as any,
          created_at: r.actor.createdAt.toISOString(),
          updated_at: r.actor.updatedAt.toISOString(),
        }
      : null,
    supporting_provider: r.supportingProvider
      ? {
          id: r.supportingProvider.id,
          email: r.supportingProvider.email,
          full_name: r.supportingProvider.fullName,
          role: r.supportingProvider.role as any,
          created_at: r.supportingProvider.createdAt.toISOString(),
          updated_at: r.supportingProvider.updatedAt.toISOString(),
        }
      : null,
    note: r.note
      ? {
          id: r.note.id,
          appointment_id: r.note.appointmentId,
          author_provider_id: r.note.authorProviderId,
          content: r.note.content,
          created_at: r.note.createdAt.toISOString(),
          updated_at: r.note.updatedAt.toISOString(),
        }
      : null,
  }));
}