import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-auth';
import { getUnconfirmedAlerts } from '@/lib/alerts/queries';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertList } from '@/components/alerts/AlertList';
import { formatDateTime } from '@/lib/utils/dates';

export default async function AlertsPage() {
  const user = await requireAuth();
  if (user.profile.role !== 'front_desk') {
    redirect('/');
  }
  const alerts = await getUnconfirmedAlerts();
  const canDismiss = true;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Alerts</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Requested appointments nearing their start time that need attention
          </p>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-sm font-semibold text-amber-800">
              {alerts.length} alert{alerts.length === 1 ? '' : 's'} pending
            </span>
          </div>
        )}
      </div>

      {/* Rule explanation */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">Alert escalation rules</p>
            <p className="mt-0.5 text-xs text-blue-600 leading-relaxed">
              A <strong>requested</strong> appointment appears here when it is within <strong>24 hours</strong> of
              its start time. Dismissing it suppresses the alert until <strong>1 hour</strong> before the appointment,
              at which point it reappears regardless of any prior dismissal. Only front desk staff can dismiss alerts.
            </p>
          </div>
        </div>
      </div>

      {/* Alerts list */}
      <Card>
        <CardHeader>
          <CardTitle>Unconfirmed appointments within 24 h</CardTitle>
          <span className="text-xs text-[#9ca3af]">{alerts.length} pending</span>
        </CardHeader>
        <CardBody className="p-0">
          <AlertList
            canDismiss={canDismiss}
            alerts={alerts.map((a) => ({
              id: a.id,
              patientName: a.patient?.full_name ?? 'Unknown patient',
              providerName: a.provider.full_name,
              scheduledStart: formatDateTime(a.scheduled_start),
            }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}