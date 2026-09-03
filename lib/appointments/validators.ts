import type { AppointmentStatus } from '@/lib/db/types';
import { canTransition } from '@/lib/appointments/status';
import type { AppointmentForPermission } from '@/lib/appointments/permissions';

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateBooking(
  appointment: AppointmentForPermission,
  now = new Date(),
): ValidationResult {
  if (appointment.patient_id !== null || appointment.status !== null) {
    return { ok: false, error: 'This slot is already booked.' };
  }
  if (
    appointment.scheduled_start &&
    new Date(appointment.scheduled_start).getTime() < now.getTime()
  ) {
    return {
      ok: false,
      error: 'Cannot book an appointment slot that is in the past.',
    };
  }
  return { ok: true };
}

export function validateTransition(
  from: AppointmentStatus | null,
  to: AppointmentStatus,
  context?: { scheduledStart?: string | Date; now?: Date },
): ValidationResult {
  if (!canTransition(from, to)) {
    return {
      ok: false,
      error: `Cannot move an appointment from "${from ?? 'available'}" to "${to}".`,
    };
  }

  // Requirement: It can be marked No Show only from Confirmed, and only after the slot's scheduled time has passed.
  if (to === 'no_show' && context?.scheduledStart) {
    const start = new Date(context.scheduledStart);
    const now = context.now ?? new Date();
    if (start.getTime() > now.getTime()) {
      return {
        ok: false,
        error: 'Cannot mark an appointment as No Show before its scheduled time has passed.',
      };
    }
  }

  return { ok: true };
}

export function validateCancellation(appointment: AppointmentForPermission): ValidationResult {
  if (appointment.status !== 'requested' && appointment.status !== 'confirmed') {
    return {
      ok: false,
      error: 'Only requested or confirmed appointments can be cancelled.',
    };
  }
  return { ok: true };
}

export function validateDismissal(appointment: AppointmentForPermission): ValidationResult {
  if (appointment.status !== 'requested') {
    return { ok: false, error: 'Only requested appointments have an unconfirmed alert.' };
  }
  return { ok: true };
}

export function validateSlotArchive(appointment: AppointmentForPermission): ValidationResult {
  if (appointment.patient_id !== null || appointment.status !== null) {
    return { ok: false, error: 'Only available slots can be archived.' };
  }
  return { ok: true };
}