import Link from 'next/link';
import type { AppointmentsQueryInput } from '@/lib/validation/schemas';
import { APPOINTMENT_STATUSES } from '@/lib/appointments/status';
import { Input, Select, Label } from '@/components/ui/fields';

interface Props {
  providers: { id: string; full_name: string }[];
  query: AppointmentsQueryInput;
}

export function AppointmentFilters({ providers, query }: Props) {
  const fromStr = query.from
    ? new Date(query.from).toISOString().slice(0, 10)
    : '';
  const toStr = query.to
    ? new Date(query.to).toISOString().slice(0, 10)
    : '';

  return (
    <form method="get" className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 items-end gap-3">
        {/* Search */}
        <div className="sm:col-span-2 lg:col-span-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              id="search"
              name="search"
              placeholder="Patient or doctor name"
              defaultValue={query.search}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={query.status ?? ''}>
            <option value="">Any status</option>
            <option value="available">Available slot</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </Select>
        </div>

        {/* Provider */}
        <div>
          <Label htmlFor="providerId">Provider</Label>
          <Select id="providerId" name="providerId" defaultValue={query.providerId ?? ''}>
            <option value="">Any provider</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </div>

        {/* Date From */}
        <div>
          <Label htmlFor="from">From date</Label>
          <Input id="from" name="from" type="date" defaultValue={fromStr} />
        </div>

        {/* Date To */}
        <div>
          <Label htmlFor="to">To date</Label>
          <Input id="to" name="to" type="date" defaultValue={toStr} />
        </div>

        {/* Sort By & Direction */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label htmlFor="sortBy">Sort</Label>
            <Select id="sortBy" name="sortBy" defaultValue={query.sortBy}>
              <option value="scheduled_start">Time</option>
              <option value="provider">Provider</option>
              <option value="status">Status</option>
              <option value="created_at">Created</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="sortDir">Order</Label>
            <Select id="sortDir" name="sortDir" defaultValue={query.sortDir}>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-[#111111] px-4 py-2 text-xs font-semibold text-white hover:bg-[#242424] transition-colors shadow-2xs"
          >
            Apply filters
          </button>
          <Link
            href="/appointments"
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-medium text-[#6b7280] hover:text-[#111111] hover:bg-[#fafafa] transition-colors"
          >
            Reset
          </Link>
        </div>
      </div>
    </form>
  );
}