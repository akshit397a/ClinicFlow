import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { listAppointments } from '@/lib/appointments/queries';
import { listProviders } from '@/lib/providers/queries';
import { appointmentsQuerySchema } from '@/lib/validation/schemas';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { AppointmentFilters } from '@/components/appointments/AppointmentFilters';
import { AppointmentTable } from '@/components/appointments/AppointmentTable';

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
  const user = await requireAuth();
  const raw = await searchParams;

  const parsed = appointmentsQuerySchema.safeParse({
    page: single(raw.page) ?? 1,
    pageSize: single(raw.pageSize) ?? 20,
    search: single(raw.search) ?? undefined,
    status: single(raw.status) ?? undefined,
    providerId: single(raw.providerId) ?? undefined,
    from: single(raw.from) ?? undefined,
    to: single(raw.to) ?? undefined,
    sortBy: single(raw.sortBy) ?? undefined,
    sortDir: single(raw.sortDir) ?? undefined,
  });
  const query = parsed.success ? parsed.data : appointmentsQuerySchema.parse({});

  const [page, providers] = await Promise.all([
    listAppointments(query, user.profile),
    listProviders(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Appointments</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            {page.total} appointment{page.total === 1 ? '' : 's'} found
          </p>
        </div>
        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white hover:bg-[#242424] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Book from schedule
        </Link>
      </div>

      {/* Filters card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & search</CardTitle>
        </CardHeader>
        <CardBody>
          <AppointmentFilters providers={providers} query={query} />
        </CardBody>
      </Card>

      {/* Results table */}
      <Card>
        <CardBody className="p-0">
          {page.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f4f6]">
                <svg className="w-6 h-6 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#374151]">No appointments found</p>
              <p className="mt-1 text-xs text-[#9ca3af]">Try adjusting your filters</p>
            </div>
          ) : (
            <AppointmentTable rows={page.rows} />
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {page.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#9ca3af]">
            Showing {(page.page - 1) * query.pageSize + 1}–{Math.min(page.page * query.pageSize, page.total)} of {page.total}
          </p>
          <Pagination page={page.page} totalPages={page.totalPages} buildHref={(p) => buildHref(raw, p)} />
        </div>
      )}
    </div>
  );
}