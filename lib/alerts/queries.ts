import { addHours } from 'date-fns';
import type { AppointmentListItem, AppointmentStatus } from '@/lib/db/types';
import { prisma } from '@/lib/prisma';

const ALERT_WINDOW_HOURS = 24;
const REAPPEAR_HOURS = 1;

export interface AlertCandidate {
  status: AppointmentStatus | null;
  scheduled_start: string;
  alert_dismissed_at: string | null;
}

export function isUnconfirmedAlert(
  candidate: AlertCandidate,
  now: Date = new Date(),
): boolean {
  if (candidate.status !== 'requested') return false;

  const start = new Date(candidate.scheduled_start);
  const minutesUntil = Math.round((start.getTime() - now.getTime()) / 60000);
  if (minutesUntil <= 0) return false;
  if (minutesUntil > ALERT_WINDOW_HOURS * 60) return false;

  if (candidate.alert_dismissed_at && minutesUntil > REAPPEAR_HOURS * 60) {
    return false;
  }

  return true;
}

export async function getUnconfirmedAlerts(): Promise<AppointmentListItem[]> {
  const now = new Date();
  const maxTime = addHours(now, ALERT_WINDOW_HOURS);
  const reappearThreshold = addHours(now, REAPPEAR_HOURS);

  const rows = await prisma.appointment.findMany({
    where: {
      status: 'requested',
      scheduledStart: {
        gt: now,
        lte: maxTime,
      },
      archivedAt: null,
      OR: [
        { alertDismissedAt: null },
        { scheduledStart: { lte: reappearThreshold } },
      ],
    },
    include: {
      patient: true,
      provider: true,
    },
    orderBy: {
      scheduledStart: 'asc',
    },
  });

  return rows.map((r) => ({
    id: r.id,
    provider_id: r.providerId,
    patient_id: r.patientId,
    scheduled_start: r.scheduledStart.toISOString(),
    duration_minutes: r.durationMinutes,
    status: r.status as any,
    cancellation_reason: r.cancellationReason,
    archived_at: r.archivedAt ? r.archivedAt.toISOString() : null,
    archived_by: r.archivedById,
    alert_dismissed_at: r.alertDismissedAt ? r.alertDismissedAt.toISOString() : null,
    alert_dismissed_by: r.alertDismissedById,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    patient: r.patient
      ? {
          id: r.patient.id,
          full_name: r.patient.fullName,
          email: r.patient.email,
          phone: r.patient.phone,
          date_of_birth: r.patient.dateOfBirth ? r.patient.dateOfBirth.toISOString().split('T')[0] : null,
          created_at: r.patient.createdAt.toISOString(),
          updated_at: r.patient.updatedAt.toISOString(),
        }
      : null,
    provider: {
      id: r.provider.id,
      email: r.provider.email,
      full_name: r.provider.fullName,
      role: r.provider.role as any,
      created_at: r.provider.createdAt.toISOString(),
      updated_at: r.provider.updatedAt.toISOString(),
    },
  }));
}

export async function countUnconfirmedAlerts(): Promise<number> {
  const now = new Date();
  const maxTime = addHours(now, ALERT_WINDOW_HOURS);
  const reappearThreshold = addHours(now, REAPPEAR_HOURS);

  return prisma.appointment.count({
    where: {
      status: 'requested',
      scheduledStart: {
        gt: now,
        lte: maxTime,
      },
      archivedAt: null,
      OR: [
        { alertDismissedAt: null },
        { scheduledStart: { lte: reappearThreshold } },
      ],
    },
  });
}