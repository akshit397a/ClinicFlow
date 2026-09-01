import type { AppointmentsQueryInput } from '@/lib/validation/schemas';
import { APPOINTMENT_STATUSES } from '@/lib/appointments/status';
import { Input, Select, Label } from '@/components/ui/fields';

interface Props {
  providers: { id: string; full_name: string }[];
  query: AppointmentsQueryInput;
}

export function AppointmentFilters({ providers, query }: Props) {
  return (
    <form method="get" className="grid grid-cols-2 items-end gap-3 md:grid-cols-6">
      <div className="col-span-2">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            id="search"
            name="search"
            placeholder="Patient or provider name"
            defaultValue={query.search}
            className="pl-9"
          />
        </div>
      </div>

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

      <div>
        <Label htmlFor="sortBy">Sort by</Label>
        <Select id="sortBy" name="sortBy" defaultValue={query.sortBy}>
          <option value="scheduled_start">Time</option>
          <option value="created_at">Created</option>
          <option value="status">Status</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="sortDir">Direction</Label>
        <Select id="sortDir" name="sortDir" defaultValue={query.sortDir}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </Select>
      </div>

      <div className="col-span-2 md:col-span-6 flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white hover:bg-[#242424] transition-colors"
        >
          Apply filters
        </button>
        <a
          href="/appointments"
          className="text-sm font-medium text-[#6b7280] hover:text-[#111111] transition-colors"
        >
          Reset
        </a>
      </div>
    </form>
  );
}