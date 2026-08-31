import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { listAppointments } from '@/lib/appointments/queries';
import { listProviders } from '@/lib/providers/queries';
import { appointmentsQuerySchema } from '@/lib/validation/schemas';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { AppointmentFilters } from '@/components/appointments/AppointmentFilters';
import { AppointmentTable } from '@/components/appointments/AppointmentTable';
import { formatDate } from '@/lib/utils/dates';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function buildHref(current: Record<string, string | string[] | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v) params.set(key, v);
  }
  params.set('page', String(page));
  return `/appointments?${params.toString()}`;
}

export default async function AppointmentsPage({ searchParams }: Props) {
  await requireAuth();
  const raw = await searchParams;

  const parsed = appointmentsQuerySchema.safeParse({
    page: single(raw.page) ?? 1,
    pageSize: single(raw.pageSize) ?? 20,
    search: single(raw.search) ?? undefined,
    status: single(raw.status) ?? undefined,
    providerId: single(raw.providerId) ?? undefined,
    sortBy: single(raw.sortBy) ?? undefined,
    sortDir: single(raw.sortDir) ?? undefined,
  });
  const query = parsed.success ? parsed.data : appointmentsQuerySchema.parse({});

  const [page, providers] = await Promise.all([listAppointments(query), listProviders()]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <Link href="/schedule" className="text-sm font-medium text-blue-600 hover:underline">
          Book from schedule
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardBody>
          <AppointmentFilters providers={providers} query={query} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0 sm:p-0">
          {page.rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No appointments match the current filters.
            </p>
          ) : (
            <div className="px-4 pt-4">
              <AppointmentTable rows={page.rows} />
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-center text-xs text-slate-500">
        Showing {page.rows.length} of {page.total} · {formatDate(new Date())}
      </p>
      <Pagination
        page={page.page}
        totalPages={page.totalPages}
        buildHref={(p) => buildHref(raw, p)}
      />
    </div>
  );
}