import { requireAuth } from '@/lib/auth/require-auth';
import { listProviders } from '@/lib/providers/queries';
import { getDaySchedule } from '@/lib/appointments/queries';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { DaySchedule } from '@/components/schedule/DaySchedule';
import { BulkAvailabilityForm } from '@/components/schedule/BulkAvailabilityForm';
import { Input, Label, Select } from '@/components/ui/fields';
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
  const providerId = single(raw.provider_id) ?? defaultProviderId;

  const rows = providerId
    ? await getDaySchedule(providerId, date)
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold">Schedule</h1>

      <Card>
        <CardHeader>
          <CardTitle>View a day</CardTitle>
        </CardHeader>
        <CardBody>
          <form method="get" className="grid grid-cols-2 items-end gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="provider_id">Provider</Label>
              <Select id="provider_id" name="provider_id" defaultValue={providerId}>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={selectedDate} />
            </div>
            <div>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Show day
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {formatDate(date)} —{' '}
            {providers.find((p) => p.id === providerId)?.full_name ?? 'Provider'}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <DaySchedule rows={rows} providerId={providerId} date={date} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk availability generation</CardTitle>
        </CardHeader>
        <CardBody>
          <BulkAvailabilityForm providers={providers} defaultProviderId={defaultProviderId} />
        </CardBody>
      </Card>
    </div>
  );
}