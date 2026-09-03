import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { listPatients } from '@/lib/patients/queries';
import { patientsQuerySchema } from '@/lib/validation/schemas';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { PatientForm } from '@/components/patients/PatientForm';

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
  return `/patients?${params.toString()}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

export default async function PatientsPage({ searchParams }: Props) {
  const user = await requireAuth();
  const raw = await searchParams;

  const parsed = patientsQuerySchema.safeParse({
    page: single(raw.page) ?? 1,
    pageSize: single(raw.pageSize) ?? 10,
    search: single(raw.search) ?? undefined,
  });
  const query = parsed.success ? parsed.data : patientsQuerySchema.parse({});

  const page = await listPatients(query);
  const isFrontDesk = user.profile.role === 'front_desk';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Patients</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            {page.total} patient{page.total === 1 ? '' : 's'} registered in clinical directory (showing up to 10 per page)
          </p>
        </div>
      </div>

      {/* Role-responsive grid: 2-column layout for Front Desk (List + Add Form), full-width layout for Providers */}
      <div className={isFrontDesk ? 'grid gap-6 lg:grid-cols-3' : 'w-full'}>
        {/* Patient list container */}
        <div className={`space-y-4 ${isFrontDesk ? 'lg:col-span-2' : 'w-full'}`}>
          {/* Search bar */}
          <form method="get" className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search"
                name="search"
                type="text"
                placeholder="Search patients by name, email, or phone..."
                defaultValue={query.search}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-3 py-2 text-sm text-[#111111] placeholder:text-[#9ca3af] outline-none focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/10 transition-all"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white hover:bg-[#242424] transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Patients table card */}
          <Card className="w-full">
            <CardBody className="p-0">
              {page.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f4f6]">
                    <svg className="w-6 h-6 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#374151]">No patients found</p>
                  <p className="mt-1 text-xs text-[#9ca3af]">Try a different search term or clear the filter</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#f3f4f6] bg-[#f8f9fa]/50">
                        <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
                          Patient
                        </th>
                        {!isFrontDesk && (
                          <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
                            Date of Birth
                          </th>
                        )}
                        <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
                          Contact Email
                        </th>
                        <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
                          Phone
                        </th>
                        <th className="py-3.5 pr-5 text-right text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.rows.map((patient, i) => (
                        <tr
                          key={patient.id}
                          className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#fafafa] transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                  avatarColors[i % avatarColors.length]
                                }`}
                              >
                                {getInitials(patient.full_name)}
                              </div>
                              <Link
                                href={`/patients/${patient.id}`}
                                className="font-semibold text-[#111111] hover:underline"
                              >
                                {patient.full_name}
                              </Link>
                            </div>
                          </td>
                          {!isFrontDesk && (
                            <td className="py-3.5 px-4 text-[#6b7280] tabular-nums">
                              {patient.date_of_birth ?? '—'}
                            </td>
                          )}
                          <td className="py-3.5 px-4 text-[#6b7280]">{patient.email ?? '—'}</td>
                          <td className="py-3.5 px-4 text-[#6b7280] tabular-nums">{patient.phone ?? '—'}</td>
                          <td className="py-3.5 pr-5 text-right">
                            <Link
                              href={`/patients/${patient.id}`}
                              className="text-xs font-semibold text-[#111111] hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>View History</span>
                              <span aria-hidden="true">→</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Pagination Controls — capped at 10 items per page */}
          {page.totalPages > 1 && (
            <div className="pt-2">
              <Pagination
                page={page.page}
                totalPages={page.totalPages}
                buildHref={(p) => buildHref(raw, p)}
              />
            </div>
          )}
        </div>

        {/* Add patient form — only visible to front desk */}
        {isFrontDesk && (
          <div className="lg:col-span-1">
            <Card className="h-fit sticky top-6">
              <CardHeader>
                <CardTitle>Add New Patient</CardTitle>
              </CardHeader>
              <CardBody>
                <PatientForm mode="create" />
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}