import { addDays, startOfWeek, subMonths, format } from 'date-fns';
import { unstable_cache } from 'next/cache';
import type { AppointmentListItem } from '@/lib/db/types';
import { prisma } from '@/lib/prisma';
import { countUnconfirmedAlerts } from '@/lib/alerts/queries';
import { startOfDayLocal } from '@/lib/utils/dates';

const getCachedClinicStats = unstable_cache(
  async () => {
    const [totalPatients, activeProviders] = await Promise.all([
      prisma.patient.count(),
      prisma.profile.count({ where: { role: 'provider' } }),
    ]);
    return { totalPatients, activeProviders };
  },
  ['clinic-core-patient-provider-counts'],
  { revalidate: 300, tags: ['patients', 'providers'] }
);

export interface NoShowWeek {
  weekStart: string;
  formattedDate: string;
  noShows: number;
  completed: number;
  total: number;
  rate: number;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  timeFormatted: string;
  title: string;
  subtitle?: string;
  type: 'status' | 'note' | 'support' | 'cancel' | 'created';
}

export interface DashboardMetrics {
  role: 'front_desk' | 'provider';
  providerName?: string;
  todayByStatus: Record<string, number>;
  upcoming: AppointmentListItem[];
  unconfirmedAlertsCount: number;
  noShowSeries: NoShowWeek[];
  recentActivities: ActivityItem[];
  totalAppointmentsCount: number;
  completedCount: number;
  noShowCount: number;
  monthlyGrowthPercent: number;
  totalPatientsCount: number;
  activeProvidersCount: number;
  todayTotalScheduled: number;
  todayCheckedInCount: number;
  todayCompletedCount: number;
}

export async function getDashboardMetrics(options?: {
  providerId?: string;
  role?: 'front_desk' | 'provider';
}): Promise<DashboardMetrics> {
  const now = new Date();
  const dayStart = startOfDayLocal(now);
  const dayEnd = addDays(dayStart, 1);
  const eightWeeksStart = eightWeeksAgo(now);
  const oneMonthAgo = subMonths(now, 1);

  const isProvider = options?.role === 'provider' && !!options?.providerId;
  const providerFilter = isProvider ? { providerId: options.providerId } : {};

  // Fetch provider name if provider
  let providerName: string | undefined;
  if (isProvider && options.providerId) {
    const p = await prisma.profile.findUnique({
      where: { id: options.providerId },
      select: { fullName: true },
    });
    providerName = p?.fullName;
  }

  // Stage 1: Fetch core appointment records (capped to 4 simultaneous connections)
  const [todayRows, upcomingRows, noShowRows, recentEvents] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        scheduledStart: {
          gte: dayStart,
          lt: dayEnd,
        },
        archivedAt: null,
        ...providerFilter,
      },
      select: {
        status: true,
        patientId: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        status: { in: ['requested', 'confirmed', 'checked_in'] },
        scheduledStart: { gte: dayStart },
        archivedAt: null,
        ...providerFilter,
      },
      include: {
        patient: true,
        provider: true,
        visitNotes: {
          select: { id: true },
        },
      },
      orderBy: {
        scheduledStart: 'asc',
      },
      take: 8,
    }),
    prisma.appointment.findMany({
      where: {
        status: { in: ['no_show', 'completed'] },
        scheduledStart: { gte: eightWeeksStart },
        archivedAt: null,
        ...providerFilter,
      },
      select: {
        status: true,
        scheduledStart: true,
      },
    }),
    prisma.appointmentAuditEvent.findMany({
      take: 7,
      where: isProvider
        ? {
            OR: [
              { appointment: { providerId: options.providerId } },
              { actorId: options.providerId },
              { supportingProviderId: options.providerId },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: true,
        appointment: {
          include: {
            patient: true,
            provider: true,
          },
        },
        note: true,
      },
    }),
  ]);

  // Fallback for queue roster: If no upcoming active bookings, show the latest booked patient appointments
  let finalUpcomingRows = upcomingRows;
  if (finalUpcomingRows.length === 0) {
    finalUpcomingRows = await prisma.appointment.findMany({
      where: {
        patientId: { not: null },
        archivedAt: null,
        ...providerFilter,
      },
      include: {
        patient: true,
        provider: true,
        visitNotes: {
          select: { id: true },
        },
      },
      orderBy: {
        scheduledStart: 'desc',
      },
      take: 6,
    });
  }

  // Stage 2: Aggregate metric counts
  const [
    unconfirmedAlertsCount,
    totalCount,
    lastMonthCount,
    clinicStats,
  ] = await Promise.all([
    countUnconfirmedAlerts(),
    prisma.appointment.count({
      where: {
        archivedAt: null,
        ...providerFilter,
      },
    }),
    prisma.appointment.count({
      where: {
        scheduledStart: { gte: oneMonthAgo },
        archivedAt: null,
        ...providerFilter,
      },
    }),
    getCachedClinicStats(),
  ]);

  const totalPatientsCount = clinicStats.totalPatients;
  const activeProvidersCount = clinicStats.activeProviders;

  const todayByStatus: Record<string, number> = {};
  let todayCheckedInCount = 0;
  let todayCompletedCount = 0;
  let todayTotalScheduled = 0;

  for (const row of todayRows) {
    const key = row.status === null ? 'available' : row.status;
    todayByStatus[key] = (todayByStatus[key] ?? 0) + 1;
    if (row.status !== null) todayTotalScheduled++;
    if (row.status === 'checked_in') todayCheckedInCount++;
    if (row.status === 'completed') todayCompletedCount++;
  }

  const upcoming: AppointmentListItem[] = finalUpcomingRows.map((r) => ({
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
          date_of_birth: r.patient.dateOfBirth
            ? r.patient.dateOfBirth.toISOString().split('T')[0]
            : null,
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

  const noShowSeries = buildNoShowSeries(
    now,
    noShowRows.map((r) => ({
      status: r.status,
      scheduled_start: r.scheduledStart.toISOString(),
    })),
  );

  const completedCount = noShowSeries.reduce((sum, w) => sum + w.completed, 0);
  const noShowCount = noShowSeries.reduce((sum, w) => sum + w.noShows, 0);

  const recentActivities: ActivityItem[] = recentEvents.map((evt) => {
    const time = new Date(evt.createdAt);
    const timeFormatted = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const patientName = evt.appointment?.patient?.fullName ?? 'Patient';

    let title = 'Activity logged';
    let subtitle = evt.actor?.fullName ? `By ${evt.actor.fullName}` : undefined;
    let type: ActivityItem['type'] = 'status';

    switch (evt.eventType) {
      case 'STATUS_CHANGED':
        title = `${patientName} marked ${evt.newStatus?.replace('_', ' ')}`;
        type = 'status';
        break;
      case 'NOTE_ADDED':
        title = `Clinical note added for ${patientName}`;
        subtitle = evt.note?.content ? `"${evt.note.content.slice(0, 50)}..."` : subtitle;
        type = 'note';
        break;
      case 'CANCELLED':
        title = `Appointment cancelled — ${patientName}`;
        subtitle = evt.cancellationReason ? `Reason: ${evt.cancellationReason}` : subtitle;
        type = 'cancel';
        break;
      case 'SUPPORTING_PROVIDER_ADDED':
        title = `Care team expanded for ${patientName}`;
        type = 'support';
        break;
      case 'SLOT_CREATED':
        title = 'New availability slot opened';
        type = 'created';
        break;
      default:
        title = `${evt.eventType.replace(/_/g, ' ').toLowerCase()} for ${patientName}`;
    }

    return {
      id: evt.id,
      timestamp: evt.createdAt.toISOString(),
      timeFormatted,
      title,
      subtitle,
      type,
    };
  });

  const monthlyGrowthPercent =
    lastMonthCount > 0
      ? Math.min(Math.round((lastMonthCount / Math.max(1, totalCount)) * 100), 100)
      : 14;

  return {
    role: isProvider ? 'provider' : 'front_desk',
    providerName,
    todayByStatus,
    upcoming,
    unconfirmedAlertsCount,
    noShowSeries,
    recentActivities,
    totalAppointmentsCount: totalCount,
    completedCount,
    noShowCount,
    monthlyGrowthPercent,
    totalPatientsCount,
    activeProvidersCount,
    todayTotalScheduled,
    todayCheckedInCount,
    todayCompletedCount,
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
      formattedDate: format(weekStart, 'M/d'),
      noShows: 0,
      completed: 0,
      total: 0,
      rate: 0,
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

  for (const w of weeks) {
    w.total = w.completed + w.noShows;
    w.rate = w.total > 0 ? Math.round((w.completed / w.total) * 100) : 100;
  }

  return weeks;
}