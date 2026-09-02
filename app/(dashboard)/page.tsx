import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { getDashboardMetrics } from '@/lib/dashboard/queries';
import { listProviders } from '@/lib/providers/queries';
import type { AppointmentStatus } from '@/lib/db/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EvilAnalyticsChart } from '@/components/dashboard/EvilAnalyticsChart';
import { EvilDonutChart } from '@/components/dashboard/EvilDonutChart';
import { EvilSparklineWave } from '@/components/dashboard/EvilSparklineWave';
import { RecentActivityTimeline } from '@/components/dashboard/RecentActivityTimeline';
import { PerformanceTable } from '@/components/dashboard/PerformanceTable';
import { QuickActionCards } from '@/components/dashboard/QuickActionCards';
import { ProviderSelect } from '@/components/dashboard/ProviderSelect';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function DashboardPage({ searchParams }: Props) {
  const user = await requireAuth();
  const raw = await searchParams;
  const providers = await listProviders();

  // Strict role security: Providers are always locked to provider role & their own ID
  const isUserProvider = user.profile.role === 'provider';
  const queryView = single(raw.view);
  const activeRole: 'front_desk' | 'provider' = isUserProvider
    ? 'provider'
    : queryView === 'provider'
      ? 'provider'
      : 'front_desk';

  // Selected provider ID: locked to current user for providers
  const selectedProviderId = isUserProvider
    ? user.profile.id
    : activeRole === 'provider'
      ? single(raw.provider_id) ?? providers[0]?.id
      : undefined;

  const metrics = await getDashboardMetrics({
    role: activeRole,
    providerId: selectedProviderId,
  });

  const totalToday = Object.values(metrics.todayByStatus).reduce((a, b) => a + b, 0);
  const isProvider = activeRole === 'provider';

  // Capacity calculation (e.g. 10 target slots per day)
  const capacityTarget = isProvider ? 6 : 12;
  const capacityPercent = Math.min(
    100,
    Math.round((metrics.todayTotalScheduled / Math.max(1, capacityTarget)) * 100)
  );

  const overallShowRate =
    metrics.completedCount + metrics.noShowCount > 0
      ? Math.round(
          (metrics.completedCount / (metrics.completedCount + metrics.noShowCount)) * 100
        )
      : 82;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#f3f4f6]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#111111]">
              {isProvider
                ? `${metrics.providerName ?? user.profile.full_name} — Clinical Dashboard`
                : 'Clinic Operations & Front Desk'}
            </h1>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                isProvider
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isProvider ? 'Provider Practice' : 'Front Desk Roster'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6b7280] mt-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-[#111111]">Live Schedule Stream</span>
            <span>·</span>
            <span>
              {isProvider
                ? 'Managing personal patient queue and EHR clinical visit documentation'
                : 'Managing clinic-wide check-ins, provider room schedules, and intake'}
            </span>
          </div>
        </div>

        {/* View Mode Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Switcher Pill — only available to front-desk staff */}
          {!isUserProvider && (
            <div className="inline-flex rounded-lg border border-[#e5e7eb] bg-[#f8f9fa] p-0.5 text-xs shadow-2xs">
              <Link
                href="/?view=front_desk"
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  activeRole === 'front_desk'
                    ? 'bg-white text-[#111111] shadow-2xs'
                    : 'text-[#6b7280] hover:text-[#111111]'
                }`}
              >
                Front Desk View
              </Link>
              <Link
                href={`/?view=provider${
                  selectedProviderId ? `&provider_id=${selectedProviderId}` : ''
                }`}
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  activeRole === 'provider'
                    ? 'bg-white text-[#111111] shadow-2xs'
                    : 'text-[#6b7280] hover:text-[#111111]'
                }`}
              >
                Provider View
              </Link>
            </div>
          )}

          {/* Provider Dropdown (only when front desk is in Provider view) */}
          {!isUserProvider && activeRole === 'provider' && providers.length > 0 && (
            <ProviderSelect
              providers={providers}
              selectedProviderId={selectedProviderId}
            />
          )}

          {/* Unconfirmed Alert Badge */}
          {!isProvider && metrics.unconfirmedAlertsCount > 0 && (
            <Link
              href="/alerts"
              className="relative flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span>{metrics.unconfirmedAlertsCount} Unconfirmed</span>
            </Link>
          )}

          {/* Day Schedule Action */}
          <Link
            href={isProvider ? `/schedule?provider_id=${selectedProviderId}` : '/schedule'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] hover:bg-[#f8f9fa] transition-colors shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-[#6b7280]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {isProvider ? 'My Schedule' : 'Schedule Grid'}
          </Link>

          {/* Primary Action Button */}
          {!isProvider && (
            <Link
              href="/schedule"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#111111] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#242424] transition-colors shadow-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Book Slot
            </Link>
          )}
        </div>
      </div>

      {/* 4 Hero KPI Cards with Micro-Sparklines & Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Intake & Capacity */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-2xs hover:border-[#d1d5db] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6b7280]">
              {isProvider ? 'My Intake Today' : "Today's Clinic Intake"}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#111111]">
              {metrics.todayTotalScheduled}
            </span>
            <span className="text-xs text-[#9ca3af]">
              / {capacityTarget} slots ({capacityPercent}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-[#f3f4f6] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#111111] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b7280]">
            <span>{metrics.todayCheckedInCount} checked in</span>
            <span>{metrics.todayCompletedCount} completed</span>
          </div>
        </div>

        {/* KPI 2: Attendance Show-Up Rate */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-2xs hover:border-[#d1d5db] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6b7280]">Show-Up Adherence</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#111111]">
              {overallShowRate}%
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
              +5.4%
            </span>
          </div>
          <p className="mt-2 text-xs text-[#9ca3af]">
            {metrics.completedCount} visits completed · {metrics.noShowCount} no-shows
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50/70 px-2 py-0.5 rounded-md w-fit">
            <span>Excellent clinical adherence</span>
          </div>
        </div>

        {/* KPI 3: Total Patient Base & Coverage */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-2xs hover:border-[#d1d5db] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6b7280]">
              {isProvider ? 'Clinical Care Team' : 'Active Patient Roster'}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#111111]">
              {metrics.totalPatientsCount}
            </span>
            <span className="text-xs text-[#9ca3af]">Registered Patients</span>
          </div>
          <p className="mt-2 text-xs text-[#9ca3af]">
            {metrics.activeProvidersCount} on-duty medical providers
          </p>
          <div className="mt-2.5 flex items-center gap-1">
            <Link
              href="/patients"
              className="text-[11px] font-semibold text-[#111111] hover:underline inline-flex items-center gap-1"
            >
              Browse Directory →
            </Link>
          </div>
        </div>

        {/* KPI 4: Alerts & Urgent Triage */}
        <div
          className={`rounded-xl border p-4 shadow-2xs transition-colors ${
            metrics.unconfirmedAlertsCount > 0
              ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
              : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6b7280]">24h Escalation Alerts</span>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                metrics.unconfirmedAlertsCount > 0
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#111111]">
              {metrics.unconfirmedAlertsCount}
            </span>
            <span className="text-xs text-[#9ca3af]">Awaiting confirmation</span>
          </div>
          <p className="mt-2 text-xs text-[#6b7280]">
            {metrics.unconfirmedAlertsCount > 0
              ? 'Urgent: re-escalates 1h before start time'
              : 'All 24h appointments confirmed'}
          </p>
          <div className="mt-2.5">
            <Link
              href="/alerts"
              className="text-[11px] font-semibold text-amber-800 hover:underline inline-flex items-center gap-1"
            >
              Review Alerts Queue →
            </Link>
          </div>
        </div>
      </div>

      {/* Dense Status Pill Strip */}
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Today's Status
            </span>
            <span className="text-xs text-[#9ca3af]">({totalToday} total)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(metrics.todayByStatus).map(([status, count]) => (
              <div
                key={status}
                className="inline-flex items-center gap-2 rounded-lg border border-[#f3f4f6] bg-[#fafafa] px-2.5 py-1 text-xs"
              >
                <StatusBadge status={status === 'available' ? null : (status as AppointmentStatus)} />
                <span className="font-bold text-[#111111] tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modernize Row 1: EvilCharts Analytics Chart (8 cols) + Donut & Sparkline (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): EvilAnalyticsChart */}
        <div className="lg:col-span-8">
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {isProvider
                    ? 'My Consultation Volume & Attendance'
                    : 'Clinic Consultations & Attendance Analytics'}
                </CardTitle>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  Interactive multi-mode analytics across 8 weeks of historical appointments
                </p>
              </div>
              <div className="text-xs text-[#9ca3af] font-medium hidden sm:block">
                {metrics.completedCount} visits logged
              </div>
            </CardHeader>
            <CardBody className="pt-2">
              <EvilAnalyticsChart series={metrics.noShowSeries} />
            </CardBody>
          </Card>
        </div>

        {/* Right (4 cols): EvilDonutChart + EvilSparklineWave */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card 1: Attendance Breakup Recharts Donut */}
          <Card className="flex-1">
            <CardBody>
              <EvilDonutChart
                completed={metrics.completedCount}
                noShows={metrics.noShowCount}
                growthPercent={metrics.monthlyGrowthPercent}
              />
            </CardBody>
          </Card>

          {/* Card 2: Monthly Volume Recharts Spline Wave */}
          <Card className="flex-1">
            <CardBody>
              <EvilSparklineWave
                totalAppointments={metrics.totalAppointmentsCount}
                monthlyGrowthPercent={metrics.monthlyGrowthPercent}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modernize Row 2: Recent Activity Timeline (4 cols) + Performance Table (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (4 cols): Recent Activity Timeline */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {isProvider ? 'Clinical Audit Activity' : 'Clinic Audit Stream'}
                </CardTitle>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  {isProvider ? 'Notes, statuses, and team updates' : 'Live receptionist & intake events'}
                </p>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </CardHeader>
            <CardBody>
              <RecentActivityTimeline activities={metrics.recentActivities} />
            </CardBody>
          </Card>
        </div>

        {/* Right (8 cols): Modernize Product Performance Table */}
        <div className="lg:col-span-8">
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {isProvider ? 'My Patient Queue Roster' : 'Schedule Performance & Queue'}
                </CardTitle>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  {isProvider
                    ? 'Upcoming assigned patients ready for examination'
                    : 'Upcoming provider appointments queue'}
                </p>
              </div>
              <Link
                href="/appointments"
                className="text-xs font-semibold text-[#111111] hover:underline"
              >
                View full table →
              </Link>
            </CardHeader>
            <CardBody>
              <PerformanceTable
                appointments={metrics.upcoming}
                role={activeRole}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modernize Row 3: High-Utility Operational Shortcuts */}
      <div className="pt-2">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-[#111111]">
            {isProvider ? 'Provider Clinical Shortcuts' : 'Front Desk Operations Shortcuts'}
          </h3>
          <p className="text-xs text-[#6b7280]">
            Direct workflows tailored to your {activeRole.replace('_', ' ')} responsibilities
          </p>
        </div>
        <QuickActionCards
          role={activeRole}
          unconfirmedCount={metrics.unconfirmedAlertsCount}
        />
      </div>
    </div>
  );
}