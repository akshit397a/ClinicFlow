import type { AppointmentStatus, Profile } from '@/lib/db/types';

/**
 * Lightweight view of an appointment needed for authorization decisions.
 * Intentional: permission checks only depend on who the appointment belongs to
 * and what state it is in, not on the full row.
 */
export interface AppointmentForPermission {
  provider_id: string;
  patient_id: string | null;
  status: AppointmentStatus | null;
  scheduled_start?: string | Date;
}

export function isFrontDesk(user: Profile): boolean {
  return user.role === 'front_desk';
}

export function isProvider(user: Profile): boolean {
  return user.role === 'provider';
}

export function ownsAppointment(user: Profile, appointment: AppointmentForPermission): boolean {
  return user.id === appointment.provider_id;
}

export function canBookSlot(user: Profile, appointment: AppointmentForPermission): boolean {
  const isSlot = appointment.patient_id === null && appointment.status === null;
  return isFrontDesk(user) && isSlot;
}

/** Status transitions (confirm, check in, complete, no show) — not cancellation. */
export function canTransitionStatus(
  user: Profile,
  appointment: AppointmentForPermission,
): boolean {
  return isFrontDesk(user) || ownsAppointment(user, appointment);
}

export function canCancel(user: Profile, appointment: AppointmentForPermission): boolean {
  return isFrontDesk(user) || ownsAppointment(user, appointment);
}

export function canDismissAlert(user: Profile): boolean {
  return isFrontDesk(user);
}

/** A provider may write a visit note if they are the primary or a supporting provider. */
export function canAddNote(
  user: Profile,
  appointment: AppointmentForPermission,
  supportingProviderIds: string[],
): boolean {
  return (
    isProvider(user) &&
    (ownsAppointment(user, appointment) || supportingProviderIds.includes(user.id))
  );
}

export function canAssignSupportingProvider(user: Profile): boolean {
  return isFrontDesk(user);
}

export function canRemoveSupportingProvider(user: Profile): boolean {
  return isFrontDesk(user);
}

/**
 * Availability management (create slots, archive a slot): front desk may do it
 * for any provider; a provider may only manage their own availability.
 */
export function canManageAvailability(
  user: Profile,
  appointment?: AppointmentForPermission,
): boolean {
  if (isFrontDesk(user)) return true;
  return isProvider(user) && (appointment === undefined || ownsAppointment(user, appointment));
}

/**
 * Reassigning appointments between providers:
 * Requirement: Front-desk staff can reassign appointments between providers.
 * Providers cannot reassign an appointment away from themselves.
 */
export function canReassignProvider(user: Profile): boolean {
  return isFrontDesk(user);
}

/**
 * Visit notes editing:
 * Requirement: Visit notes can be added and edited by the provider who wrote them.
 */
export function canEditNote(user: Profile, noteAuthorProviderId: string): boolean {
  return isProvider(user) && user.id === noteAuthorProviderId;
}