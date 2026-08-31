'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { toErrorMessage } from '@/lib/utils/errors';
import { fail, ok, type ActionResult } from '@/lib/utils/result';
import type { AppointmentStatus } from '@/lib/db/types';
import type { AppointmentForPermission } from '@/lib/appointments/permissions';
import {
  canAddNote,
  canArchiveSlot,
  canAssignSupportingProvider,
  canBookSlot,
  canCancel,
  canDismissAlert,
  canManageAvailability,
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
  recordSlotArchived,
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
  removeSupportingProviderSchema,
  transitionStatusSchema,
  type AddNoteInput,
  type ArchiveSlotInput,
  type AssignSupportingProviderInput,
  type BookSlotInput,
  type CancelAppointmentInput,
  type DismissAlertInput,
  type RemoveSupportingProviderInput,
  type TransitionStatusInput,
} from '@/lib/validation/schemas';

interface AppointmentRow extends AppointmentForPermission {
  id: string;
}

/** Fetch the row needed for authorization + validation of one mutation. */
async function getAppointmentForAction(id: string): Promise<AppointmentRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('appointments')
    .select('id, provider_id, patient_id, status')
    .eq('id', id)
    .maybeSingle();
  return (data as AppointmentRow | null) ?? null;
}

async function getSupportingProviderIds(appointmentId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('appointment_supporting_providers')
    .select('provider_id')
    .eq('appointment_id', appointmentId);
  return (data ?? []).map((row) => (row as { provider_id: string }).provider_id);
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

  const admin = createAdminClient();
  const { data: patient } = await admin
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();
  if (!patient) return fail('Patient not found.');

  const { error } = await admin
    .from('appointments')
    .update({ patient_id: patientId, status: 'requested' })
    .eq('id', appointmentId);
  if (error) return fail(toErrorMessage(error));

  await recordStatusChanged({
    appointmentId,
    actorId: user.id,
    oldStatus: null,
    newStatus: 'requested',
    metadata: { patientId },
  });
  refreshRelevantPaths(appointmentId);
  return ok();
}

export async function transitionStatusAction(
  input: TransitionStatusInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = transitionStatusSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid status transition.');

  const { appointmentId, toStatus } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');

  const transitionCheck = validateTransition(appointment.status, toStatus);
  if (!transitionCheck.ok) return transitionCheck;
  if (!canTransitionStatus(user.profile, appointment)) {
    return fail('Not authorized to change this appointment.');
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('appointments')
    .update({ status: toStatus })
    .eq('id', appointmentId);
  if (error) return fail(toErrorMessage(error));

  await recordStatusChanged({
    appointmentId,
    actorId: user.id,
    oldStatus: appointment.status,
    newStatus: toStatus,
  });
  refreshRelevantPaths(appointmentId);
  return ok();
}

export async function cancelAppointmentAction(
  input: CancelAppointmentInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = cancelAppointmentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid cancellation.');

  const { appointmentId, reason } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');
  if (!canCancel(user.profile, appointment)) return fail('Not authorized to cancel this appointment.');

  const cancelCheck = validateCancellation(appointment);
  if (!cancelCheck.ok) return cancelCheck;

  const admin = createAdminClient();
  const { error } = await admin
    .from('appointments')
    .update({ status: 'cancelled', cancellation_reason: reason })
    .eq('id', appointmentId);
  if (error) return fail(toErrorMessage(error));

  await recordCancelled({
    appointmentId,
    actorId: user.id,
    oldStatus: appointment.status as AppointmentStatus,
    cancellationReason: reason,
  });
  refreshRelevantPaths(appointmentId);
  return ok();
}

export async function dismissAlertAction(input: DismissAlertInput): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = dismissAlertSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid alert.');

  const { appointmentId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');
  if (!canDismissAlert(user.profile)) return fail('Not authorized to dismiss alerts.');

  const dismissalCheck = validateDismissal(appointment);
  if (!dismissalCheck.ok) return dismissalCheck;

  const admin = createAdminClient();
  const { error } = await admin
    .from('appointments')
    .update({ alert_dismissed_at: new Date().toISOString(), alert_dismissed_by: user.id })
    .eq('id', appointmentId);
  if (error) return fail(toErrorMessage(error));

  // Deliberately not audited: alert dismissal is a UI state, not a lifecycle event.
  refreshRelevantPaths(appointmentId);
  return ok();
}

export async function archiveSlotAction(input: ArchiveSlotInput): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = archiveSlotSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid slot.');

  const { appointmentId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Slot not found.');
  if (!canManageAvailability(user.profile, appointment)) {
    return fail('Not authorized to archive this slot.');
  }

  const archiveCheck = validateSlotArchive(appointment);
  if (!archiveCheck.ok) return archiveCheck;

  const admin = createAdminClient();
  const { error } = await admin
    .from('appointments')
    .update({ archived_at: new Date().toISOString(), archived_by: user.id })
    .eq('id', appointmentId);
  if (error) return fail(toErrorMessage(error));

  await recordSlotArchived({ appointmentId, actorId: user.id });
  refreshRelevantPaths(appointmentId);
  return ok();
}

export async function addNoteAction(input: AddNoteInput): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return fail('Please enter note content.');

  const { appointmentId, content } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');

  const supportingProviderIds = await getSupportingProviderIds(appointmentId);
  if (!canAddNote(user.profile, appointment, supportingProviderIds)) {
    return fail('Only the primary or a supporting provider can add visit notes.');
  }

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from('visit_notes')
    .insert({
      appointment_id: appointmentId,
      author_provider_id: user.id,
      content,
    })
    .select('id')
    .single();
  if (error) return fail(toErrorMessage(error));

  await recordNoteAdded({ appointmentId, actorId: user.id, noteId: inserted.id });
  refreshRelevantPaths(appointmentId);
  return ok();
}

export async function assignSupportingProviderAction(
  input: AssignSupportingProviderInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = assignSupportingProviderSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid provider assignment.');

  const { appointmentId, providerId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');
  if (!canAssignSupportingProvider(user.profile)) {
    return fail('Only front-desk staff can assign supporting providers.');
  }
  if (providerId === appointment.provider_id) {
    return fail('This provider is already the primary provider for the appointment.');
  }

  const admin = createAdminClient();
  const { data: provider } = await admin
    .from('profiles')
    .select('id')
    .eq('id', providerId)
    .eq('role', 'provider')
    .maybeSingle();
  if (!provider) return fail('Provider not found.');

  const { error } = await admin.from('appointment_supporting_providers').insert({
    appointment_id: appointmentId,
    provider_id: providerId,
    assigned_by: user.id,
  });
  if (error) return fail(toErrorMessage(error));

  await recordSupportingProviderAdded({
    appointmentId,
    actorId: user.id,
    providerId,
  });
  refreshRelevantPaths(appointmentId);
  return ok();
}

export async function removeSupportingProviderAction(
  input: RemoveSupportingProviderInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = removeSupportingProviderSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid provider assignment.');

  const { appointmentId, providerId } = parsed.data;
  const appointment = await getAppointmentForAction(appointmentId);
  if (!appointment) return fail('Appointment not found.');
  if (!canRemoveSupportingProvider(user.profile)) {
    return fail('Only front-desk staff can remove supporting providers.');
  }

  const admin = createAdminClient();
  const { error, count } = await admin
    .from('appointment_supporting_providers')
    .delete({ count: 'exact' })
    .eq('appointment_id', appointmentId)
    .eq('provider_id', providerId);
  if (error) return fail(toErrorMessage(error));
  if (count === 0) return fail('That provider is not assigned to this appointment.');

  await recordSupportingProviderRemoved({
    appointmentId,
    actorId: user.id,
    providerId,
  });
  refreshRelevantPaths(appointmentId);
  return ok();
}