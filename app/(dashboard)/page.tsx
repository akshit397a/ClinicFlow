import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { getDashboardMetrics } from '@/lib/dashboard/queries';
import type { AppointmentStatus } from '@/lib/db/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NoShowChart } from '@/components/dashboard/NoShowChart';
import { formatDateTime } from '@/lib/utils/dates';

export default async function DashboardPage() {
  const user = await requireAuth();
  const metrics = await getDashboardMetrics();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalToday = Object.values(metrics.todayByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
            Good morning, {user.profile.full_name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">{today}</p>
        </div>

        {/* Unconfirmed alerts banner */}
        {metrics.unconfirmedAlertsCount > 0 && (
          <Link
            href="/alerts"
            className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors group shrink-0"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            {metrics.unconfirmedAlertsCount} unconfirmed alert{metrics.unconfirmedAlertsCount === 1 ? '' : 's'}
            <svg className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* Today at a glance — stat chips */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(metrics.todayByStatus).map(([status, count]) => (
          <div
            key={status}
            className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] text-center"
          >
            <p className="text-2xl font-bold text-[#111111]">{count}</p>
            <div className="mt-1 flex justify-center">
              <StatusBadge status={status === 'available' ? null : (status as AppointmentStatus)} />
            </div>
          </div>
        ))}
        {totalToday === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[#e5e7eb] px-4 py-6 text-center">
            <p className="text-sm text-[#9ca3af]">No appointments today</p>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming appointments</CardTitle>
            <Link href="/appointments" className="text-xs font-medium text-[#6b7280] hover:text-[#111111] transition-colors">
              View all →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {metrics.upcoming.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-[#9ca3af]">No upcoming appointments</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#f3f4f6]">
                {metrics.upcoming.map((appointment) => (
                  <li key={appointment.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#fafafa] transition-colors">
                    <div className="min-w-0">
                      <Link
                        href={`/appointments/${appointment.id}`}
                        className="text-sm font-medium text-[#111111] hover:underline truncate block"
                      >
                        {appointment.patient?.full_name ?? 'Available slot'}
                      </Link>
                      <p className="text-xs text-[#6b7280] mt-0.5 truncate">
                        {appointment.provider.full_name} · {formatDateTime(appointment.scheduled_start)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={appointment.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* No-show trend chart */}
        <Card>
          <CardHeader>
            <CardTitle>No-show trend</CardTitle>
            <span className="text-xs text-[#9ca3af]">Last 8 weeks</span>
          </CardHeader>
          <CardBody>
            <NoShowChart series={metrics.noShowSeries} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}