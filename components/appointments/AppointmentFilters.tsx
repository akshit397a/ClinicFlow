import type { AppointmentsQueryInput } from '@/lib/validation/schemas';
import { APPOINTMENT_STATUSES } from '@/lib/appointments/status';
import { Input, Select } from '@/components/ui/fields';

interface Props {
  providers: { id: string; full_name: string }[];
  query: AppointmentsQueryInput;
}

export function AppointmentFilters({ providers, query }: Props) {
  return (
    <form
      method="get"
      className="grid grid-cols-2 items-end gap-3 md:grid-cols-6"
    >
      <div className="col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="search">
          Search
        </label>
        <Input
          id="search"
          name="search"
          placeholder="Patient or provider name"
          defaultValue={query.search}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="status">
          Status
        </label>
        <Select id="status" name="status" defaultValue={query.status ?? ''}>
          <option value="">Any</option>
          <option value="available">Available slot</option>
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="providerId">
          Provider
        </label>
        <Select id="providerId" name="providerId" defaultValue={query.providerId ?? ''}>
          <option value="">Any</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="sortBy">
          Sort by
        </label>
        <Select id="sortBy" name="sortBy" defaultValue={query.sortBy}>
          <option value="scheduled_start">Time</option>
          <option value="created_at">Created</option>
          <option value="status">Status</option>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="sortDir">
          Direction
        </label>
        <Select id="sortDir" name="sortDir" defaultValue={query.sortDir}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </Select>
      </div>

      <div className="col-span-2 md:col-span-6">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}