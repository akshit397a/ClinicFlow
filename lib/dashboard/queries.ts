import { addDays, startOfWeek } from 'date-fns';
import type { AppointmentListItem } from '@/lib/db/types';
import { prisma } from '@/lib/prisma';
import { countUnconfirmedAlerts } from '@/lib/alerts/queries';
import { startOfDayLocal } from '@/lib/utils/dates';

export interface NoShowWeek {
  weekStart: string;
  noShows: number;
  completed: number;
}

export interface DashboardMetrics {
  todayByStatus: Record<string, number>;
  upcoming: AppointmentListItem[];
  unconfirmedAlertsCount: number;
  noShowSeries: NoShowWeek[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const dayStart = startOfDayLocal(now);
  const dayEnd = addDays(dayStart, 1);
  const eightWeeksStart = eightWeeksAgo(now);

  const [todayRows, upcomingRows, noShowRows, unconfirmedAlertsCount] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          scheduledStart: {
            gte: dayStart,
            lt: dayEnd,
          },
          archivedAt: null,
        },
        select: {
          status: true,
          patientId: true,
        },
      }),
      prisma.appointment.findMany({
        where: {
          status: { in: ['requested', 'confirmed', 'checked_in'] },
          scheduledStart: { gte: now },
          archivedAt: null,
        },
        include: {
          patient: true,
          provider: true,
        },
        orderBy: {
          scheduledStart: 'asc',
        },
        take: 5,
      }),
      prisma.appointment.findMany({
        where: {
          status: { in: ['no_show', 'completed'] },
          scheduledStart: { gte: eightWeeksStart },
          archivedAt: null,
        },
        select: {
          status: true,
          scheduledStart: true,
        },
      }),
      countUnconfirmedAlerts(),
    ]);

  const todayByStatus: Record<string, number> = {};
  for (const row of todayRows) {
    const key = row.status === null ? 'available' : row.status;
    todayByStatus[key] = (todayByStatus[key] ?? 0) + 1;
  }

  const upcoming: AppointmentListItem[] = upcomingRows.map((r) => ({
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

  return {
    todayByStatus,
    upcoming,
    unconfirmedAlertsCount,
    noShowSeries: buildNoShowSeries(
      now,
      noShowRows.map((r) => ({ status: r.status, scheduled_start: r.scheduledStart.toISOString() })),
    ),
  };
}

function eightWeeksAgo(now: Date): Date {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  return addDays(weekStart, -7 * 7);
}

function buildNoShowSeries(
  now: Date,
  rows: { status: string | null; scheduled_start: string }[],
): NoShowWeek[] {
  const currentWeek = startOfWeek(now, { weekStartsOn: 1 });

  const weeks: NoShowWeek[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = addDays(currentWeek, -i * 7);
    weeks.push({
      weekStart: weekStart.toISOString(),
      noShows: 0,
      completed: 0,
    });
  }

  const byWeek = new Map<string, NoShowWeek>();
  for (const week of weeks) byWeek.set(week.weekStart, week);

  for (const row of rows) {
    const weekStart = startOfWeek(new Date(row.scheduled_start), { weekStartsOn: 1 });
    const bucket = byWeek.get(weekStart.toISOString());
    if (!bucket) continue;
    if (row.status === 'no_show') bucket.noShows += 1;
    if (row.status === 'completed') bucket.completed += 1;
  }

  return weeks;
}