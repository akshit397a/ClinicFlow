'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/prisma';
import { toErrorMessage } from '@/lib/utils/errors';
import { fail, ok, type ActionResult } from '@/lib/utils/result';
import type { AppointmentForPermission } from '@/lib/appointments/permissions';
import {
  canAddNote,
  canAssignSupportingProvider,
  canBookSlot,
  canCancel,
  canDismissAlert,
  canEditNote,
  canManageAvailability,
  canReassignProvider,
  canRemoveSupportingProvider,
  canTransitionStatus,
} from '@/lib/appointments/permissions';
import {
  validateBooking,
  validateCancellation,
  validateDismissal,
  validateSlotArchive,
  validateTransition,
} from '@/lib/appointments/validators';
import {
  recordCancelled,
  recordNoteAdded,
  recordNoteEdited,
  recordProviderReassigned,
  recordSlotArchived,
  recordSlotEdited,
  recordSlotRestored,
  recordStatusChanged,
  recordSupportingProviderAdded,
  recordSupportingProviderRemoved,
} from '@/lib/audit/events';
import {
  addNoteSchema,
  archiveSlotSchema,
  assignSupportingProviderSchema,
  bookSlotSchema,
  cancelAppointmentSchema,
  dismissAlertSchema,
  editNoteSchema,
  editSlotSchema,
  reassignProviderSchema,
  removeSupportingProviderSchema,
  restoreSlotSchema,
  transitionStatusSchema,
  type AddNoteInput,
  type ArchiveSlotInput,
  type AssignSupportingProviderInput,
  type BookSlotInput,
  type CancelAppointmentInput,
  type DismissAlertInput,
  type EditNoteInput,
  type EditSlotInput,
  type ReassignProviderInput,
  type RemoveSupportingProviderInput,
  type RestoreSlotInput,
  type TransitionStatusInput,
} from '@/lib/validation/schemas';

interface AppointmentRow extends AppointmentForPermission {
  id: string;
  scheduled_start: string;
}

async function getAppointmentForAction(id: string): Promise<AppointmentRow | null> {
  const row = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, providerId: true, patientId: true, status: true, scheduledStart: true },
  });
  if (!row) return null;
  return {
    id: row.id,
    provider_id: row.providerId,
    patient_id: row.patientId,
    status: row.status as any,
    scheduled_start: row.scheduledStart.toISOString(),
  };
}

async function getSupportingProviderIds(appointmentId: string): Promise<string[]> {
  const rows = await prisma.appointmentSupportingProvider.findMany({
    where: { appointmentId },
    select: { providerId: true },
  });
  return rows.map((r) => r.providerId);
}

function refreshRelevantPaths(appointmentId: string): void {
  revalidatePath('/');
  revalidatePath('/appointments');
  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath('/schedule');
  revalidatePath('/patients');
  revalidatePath('/alerts');
}

export async function bookSlotAction(input: BookSlotInput): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = bookSlotSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid booking details.');

  const { appointmentId, patientId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Slot not found.');
  if (!canBookSlot(user.profile, appointment)) return fail('Not authorized to book slots.');

  const bookingCheck = validateBooking(appointment);
  if (!bookingCheck.ok) return bookingCheck;

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        patientId,
        status: 'confirmed',
      },
    });

    await recordStatusChanged({
      appointmentId,
      actorId: user.id,
      oldStatus: null,
      newStatus: 'confirmed',
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function transitionStatusAction(
  input: TransitionStatusInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = transitionStatusSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid status change details.');

  const { appointmentId, toStatus } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');

  if (!canTransitionStatus(user.profile, appointment)) {
    return fail('Not authorized to change appointment status.');
  }

  const transitionCheck = validateTransition(appointment.status, toStatus, {
    scheduledStart: appointment.scheduled_start,
  });
  if (!transitionCheck.ok) return transitionCheck;

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: toStatus,
      },
    });

    await recordStatusChanged({
      appointmentId,
      actorId: user.id,
      oldStatus: appointment.status,
      newStatus: toStatus,
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function cancelAppointmentAction(
  input: CancelAppointmentInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = cancelAppointmentSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid cancellation details.');

  const { appointmentId, reason } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');

  if (!canCancel(user.profile, appointment)) {
    return fail('Not authorized to cancel appointments.');
  }

  const cancelCheck = validateCancellation(appointment);
  if (!cancelCheck.ok) return cancelCheck;

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        cancellationReason: reason,
      },
    });

    await recordCancelled({
      appointmentId,
      actorId: user.id,
      oldStatus: appointment.status!,
      cancellationReason: reason,
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function addNoteAction(input: AddNoteInput): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid note details.');

  const { appointmentId, content } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');

  const supporting = await getSupportingProviderIds(appointmentId);
  if (!canAddNote(user.profile, appointment, supporting)) {
    return fail('Only assigned providers can add notes.');
  }

  try {
    const note = await prisma.visitNote.create({
      data: {
        appointmentId,
        authorProviderId: user.id,
        content: content.trim(),
      },
    });

    await recordNoteAdded({
      appointmentId,
      actorId: user.id,
      noteId: note.id,
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function assignSupportingProviderAction(
  input: AssignSupportingProviderInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = assignSupportingProviderSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid assignment details.');

  const { appointmentId, providerId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');

  if (!canAssignSupportingProvider(user.profile)) {
    return fail('Not authorized to assign supporting providers.');
  }

  if (appointment.provider_id === providerId) {
    return fail('Provider is already the primary on this appointment.');
  }

  try {
    await prisma.appointmentSupportingProvider.create({
      data: {
        appointmentId,
        providerId,
        assignedById: user.id,
      },
    });

    await recordSupportingProviderAdded({
      appointmentId,
      actorId: user.id,
      providerId,
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function removeSupportingProviderAction(
  input: RemoveSupportingProviderInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = removeSupportingProviderSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid removal details.');

  const { appointmentId, providerId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');

  if (!canRemoveSupportingProvider(user.profile)) {
    return fail('Not authorized to remove supporting providers.');
  }

  try {
    await prisma.appointmentSupportingProvider.deleteMany({
      where: {
        appointmentId,
        providerId,
      },
    });

    await recordSupportingProviderRemoved({
      appointmentId,
      actorId: user.id,
      providerId,
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function dismissAlertAction(
  input: DismissAlertInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = dismissAlertSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid alert details.');

  const { appointmentId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');

  if (!canDismissAlert(user.profile)) {
    return fail('Not authorized to dismiss alerts.');
  }

  const dismissalCheck = validateDismissal(appointment);
  if (!dismissalCheck.ok) return dismissalCheck;

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        alertDismissedAt: new Date(),
        alertDismissedById: user.id,
      },
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function archiveSlotAction(
  input: ArchiveSlotInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = archiveSlotSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid slot details.');

  const { appointmentId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Slot not found.');

  if (!canManageAvailability(user.profile, appointment)) {
    return fail('Not authorized to manage this schedule.');
  }

  const archiveCheck = validateSlotArchive(appointment);
  if (!archiveCheck.ok) return archiveCheck;

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        archivedAt: new Date(),
        archivedById: user.id,
      },
    });

    await recordSlotArchived({
      appointmentId,
      actorId: user.id,
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function restoreSlotAction(
  input: RestoreSlotInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = restoreSlotSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid slot details.');

  const { appointmentId } = parsed.data;
  const row = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!row) return fail('Slot not found.');
  if (row.archivedAt === null) return fail('Slot is not archived.');

  if (!canManageAvailability(user.profile, { provider_id: row.providerId, patient_id: row.patientId, status: row.status as any })) {
    return fail('Not authorized to manage this schedule.');
  }

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        archivedAt: null,
        archivedById: null,
      },
    });

    await recordSlotRestored({
      appointmentId,
      actorId: user.id,
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function editSlotAction(
  input: EditSlotInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = editSlotSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid slot edit details.');

  const { appointmentId, scheduledStart, durationMinutes } = parsed.data;
  const row = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!row) return fail('Slot not found.');
  if (row.patientId !== null || row.status !== null) {
    return fail('Only unbooked availability slots can be edited.');
  }

  if (!canManageAvailability(user.profile, { provider_id: row.providerId, patient_id: row.patientId, status: row.status as any })) {
    return fail('Not authorized to edit this schedule slot.');
  }

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledStart,
        durationMinutes,
      },
    });

    await recordSlotEdited({
      appointmentId,
      actorId: user.id,
      metadata: {
        newStart: scheduledStart.toISOString(),
        durationMinutes,
      },
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function reassignProviderAction(
  input: ReassignProviderInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = reassignProviderSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid reassignment details.');

  const { appointmentId, newProviderId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');

  if (!canReassignProvider(user.profile)) {
    return fail('Only front-desk staff can reassign appointments between providers.');
  }

  if (appointment.provider_id === newProviderId) {
    return fail('Appointment is already assigned to this provider.');
  }

  const newProvider = await prisma.profile.findUnique({
    where: { id: newProviderId },
  });
  if (!newProvider || newProvider.role !== 'provider') {
    return fail('Target provider does not exist.');
  }

  try {
    const oldProviderId = appointment.provider_id;
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        providerId: newProviderId,
      },
    });

    await prisma.appointmentSupportingProvider.deleteMany({
      where: {
        appointmentId,
        providerId: newProviderId,
      },
    });

    await recordProviderReassigned({
      appointmentId,
      actorId: user.id,
      oldProviderId,
      newProviderId,
    });

    refreshRelevantPaths(appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}

export async function editNoteAction(
  input: EditNoteInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = editNoteSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid note details.');

  const { noteId, content } = parsed.data;
  const note = await prisma.visitNote.findUnique({
    where: { id: noteId },
  });
  if (!note) return fail('Visit note not found.');

  if (!canEditNote(user.profile, note.authorProviderId)) {
    return fail('Only the provider who wrote this visit note can edit it.');
  }

  try {
    await prisma.visitNote.update({
      where: { id: noteId },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
      },
    });

    await recordNoteEdited({
      appointmentId: note.appointmentId,
      actorId: user.id,
      noteId: note.id,
    });

    refreshRelevantPaths(note.appointmentId);
    return ok();
  } catch (err) {
    return fail(toErrorMessage(err));
  }
}