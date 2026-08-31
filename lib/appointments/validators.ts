import type { AppointmentStatus } from '@/lib/db/types';
import { canTransition } from '@/lib/appointments/status';
import type { AppointmentForPermission } from '@/lib/appointments/permissions';

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateBooking(appointment: AppointmentForPermission): ValidationResult {
  if (appointment.patient_id !== null || appointment.status !== null) {
    return { ok: false, error: 'This slot is already booked.' };
  }
  return { ok: true };
}

export function validateTransition(
  from: AppointmentStatus | null,
  to: AppointmentStatus,
): ValidationResult {
  if (!canTransition(from, to)) {
    return {
      ok: false,
      error: `Cannot move an appointment from "${from ?? 'available'}" to "${to}".`,
    };
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