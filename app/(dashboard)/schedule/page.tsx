import { requireAuth } from '@/lib/auth/require-auth';
import { listProviders } from '@/lib/providers/queries';
import { getDaySchedule } from '@/lib/appointments/queries';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { DaySchedule } from '@/components/schedule/DaySchedule';
import { BulkAvailabilityForm } from '@/components/schedule/BulkAvailabilityForm';
import { Label, Select } from '@/components/ui/fields';
import { formatDate } from '@/lib/utils/dates';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SchedulePage({ searchParams }: Props) {
  const user = await requireAuth();
  const raw = await searchParams;

  const providers = await listProviders();

  const selectedDate = single(raw.date) ?? new Date().toISOString().slice(0, 10);
  const date = new Date(`${selectedDate}T00:00:00`);

  const defaultProviderId =
    user.profile.role === 'provider'
      ? user.profile.id
      : providers[0]?.id ?? '';
  const providerId =
    user.profile.role === 'provider'
      ? user.profile.id
      : single(raw.provider_id) ?? defaultProviderId;

  const rows = providerId ? await getDaySchedule(providerId, date) : [];

  const selectedProvider = providers.find((p) => p.id === providerId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Schedule</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          {user.profile.role === 'provider'
            ? 'Your daily patient schedule and clinical appointments'
            : 'View and manage provider day schedules'}
        </p>
      </div>

      {/* Day picker */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user.profile.role === 'provider' ? 'Select date' : 'Select day & provider'}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <form method="get" className="flex flex-wrap items-end gap-4">
            {user.profile.role === 'provider' ? (
              <input type="hidden" name="provider_id" value={user.profile.id} />
            ) : (
              <div className="min-w-40 flex-1">
                <Label htmlFor="provider_id">Provider</Label>
                <Select id="provider_id" name="provider_id" defaultValue={providerId}>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="min-w-40 flex-1">
              <Label htmlFor="date">Date</Label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={selectedDate}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111111] outline-none focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/10 transition-all"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white hover:bg-[#242424] transition-colors"
            >
              View day
            </button>
          </form>
        </CardBody>
      </Card>

      {/* Day schedule grid */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>
            {formatDate(date)} — {rows.length} slot{rows.length === 1 ? '' : 's'}
          </CardTitle>
          {selectedProvider && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                {selectedProvider.full_name[0]}
              </div>
              <span className="text-sm font-medium text-[#374151]">{selectedProvider.full_name}</span>
            </div>
          )}
        </CardHeader>
        <CardBody className="p-0">
          <DaySchedule rows={rows} providerId={providerId} date={date} />
        </CardBody>
      </Card>

      {/* Availability generation */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user.profile.role === 'provider'
              ? 'Open availability slots'
              : 'Generate availability slots'}
          </CardTitle>
          <span className="text-xs text-[#9ca3af]">
            {user.profile.role === 'provider'
              ? 'Create recurring open slots for your practice'
              : 'Bulk create open slots for any provider'}
          </span>
        </CardHeader>
        <CardBody>
          <BulkAvailabilityForm
            providers={
              user.profile.role === 'provider'
                ? providers.filter((p) => p.id === user.profile.id)
                : providers
            }
            defaultProviderId={defaultProviderId}
          />
        </CardBody>
      </Card>
    </div>
  );
}