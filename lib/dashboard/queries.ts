import { addDays, startOfWeek } from 'date-fns';
import type { AppointmentListItem } from '@/lib/db/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { countUnconfirmedAlerts } from '@/lib/alerts/queries';
import { startOfDayLocal } from '@/lib/utils/dates';

const SCHEDULE_SELECT =
  '*, patient:patients!appointments_patient_id_fkey(*), provider:profiles!appointments_provider_id_fkey(*)';

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
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const dayStart = startOfDayLocal(now);
  const dayEnd = addDays(dayStart, 1);

  const [todayResult, upcomingResult, noShowResult, unconfirmedAlertsCount] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('status, patient_id')
        .gte('scheduled_start', dayStart.toISOString())
        .lt('scheduled_start', dayEnd.toISOString()),
      supabase
        .from('appointments')
        .select(SCHEDULE_SELECT)
        .in('status', ['requested', 'confirmed', 'checked_in'])
        .gte('scheduled_start', now.toISOString())
        .order('scheduled_start', { ascending: true })
        .range(0, 4),
      supabase
        .from('appointments')
        .select('status, scheduled_start')
        .in('status', ['no_show', 'completed'])
        .gte('scheduled_start', eightWeeksAgo(now).toISOString()),
      countUnconfirmedAlerts(),
    ]);

  if (todayResult.error) {
    throw new Error(`Failed to load today's metrics: ${todayResult.error.message}`);
  }
  if (upcomingResult.error) {
    throw new Error(`Failed to load upcoming appointments: ${upcomingResult.error.message}`);
  }
  if (noShowResult.error) {
    throw new Error(`Failed to load no-show history: ${noShowResult.error.message}`);
  }

  const todayByStatus: Record<string, number> = {};
  for (const row of todayResult.data ?? []) {
    const key = row.status === null ? 'available' : row.status;
    todayByStatus[key] = (todayByStatus[key] ?? 0) + 1;
  }

  return {
    todayByStatus,
    upcoming: (upcomingResult.data ?? []) as AppointmentListItem[],
    unconfirmedAlertsCount,
    noShowSeries: buildNoShowSeries(now, noShowResult.data ?? []),
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