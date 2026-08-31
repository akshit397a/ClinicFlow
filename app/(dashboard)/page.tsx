import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { getDashboardMetrics } from '@/lib/dashboard/queries';
import type { AppointmentStatus } from '@/lib/db/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NoShowChart } from '@/components/dashboard/NoShowChart';
import { formatDateTime } from '@/lib/utils/dates';

export default async function DashboardPage() {
  await requireAuth();
  const metrics = await getDashboardMetrics();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link
          href="/alerts"
          className="rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
        >
          {metrics.unconfirmedAlertsCount} unconfirmed alert
          {metrics.unconfirmedAlertsCount === 1 ? '' : 's'}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s schedule</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          {Object.keys(metrics.todayByStatus).length === 0 && (
            <p className="text-sm text-slate-500">No appointments today.</p>
          )}
          {Object.entries(metrics.todayByStatus).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
            >
              <StatusBadge
                status={
                  status === 'available' ? null : (status as AppointmentStatus)
                }
              />
              <span className="text-sm font-semibold text-slate-900">{count}</span>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardBody>
            {metrics.upcoming.length === 0 && (
              <p className="text-sm text-slate-500">No upcoming appointments.</p>
            )}
            <ul className="space-y-3">
              {metrics.upcoming.map((appointment) => (
                <li key={appointment.id} className="flex items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/appointments/${appointment.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {appointment.patient?.full_name ?? 'Unknown patient'}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {appointment.provider.full_name} &middot; {formatDateTime(appointment.scheduled_start)}
                    </p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>No-show trend</CardTitle>
          </CardHeader>
          <CardBody>
            <NoShowChart series={metrics.noShowSeries} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}