import type { AppointmentStatus } from '@/lib/db/types';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'requested',
  'confirmed',
  'checked_in',
  'completed',
  'no_show',
  'cancelled',
];

/**
 * Allowed lifecycle transitions:
 *   Requested -> Confirmed, Cancelled
 *   Confirmed -> Checked In, No Show, Cancelled
 *   Checked In -> Completed
 *   Completed / No Show / Cancelled are terminal.
 *
 * Booking an available slot is represented by populating patient_id and setting
 * status to 'requested' (null -> requested), which is handled by the booking
 * action, not by this transition table.
 */
export const STATUS_FLOW: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'no_show', 'cancelled'],
  checked_in: ['completed'],
  completed: [],
  no_show: [],
  cancelled: [],
};

export function isTerminal(status: AppointmentStatus | null): boolean {
  return status === 'completed' || status === 'no_show' || status === 'cancelled';
}

export function isActive(status: AppointmentStatus | null): boolean {
  return (
    status === 'requested' || status === 'confirmed' || status === 'checked_in'
  );
}

export function canTransition(
  from: AppointmentStatus | null,
  to: AppointmentStatus,
): boolean {
  if (from === null) return false; // a slot is booked, never "transitioned"
  return STATUS_FLOW[from].includes(to);
}

export function nextStatuses(from: AppointmentStatus | null): AppointmentStatus[] {
  if (from === null) return [];
  return STATUS_FLOW[from];
}