import Link from 'next/link';
import type { AppointmentListItem } from '@/lib/db/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateInput, formatTime } from '@/lib/utils/dates';

interface Props {
  rows: AppointmentListItem[];
  providerId: string;
  date: Date;
}

export function DaySchedule({ rows, providerId, date }: Props) {
  const csvHref = `/api/schedules/csv?provider_id=${providerId}&date=${formatDateInput(date)}`;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <a
          href={csvHref}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Export day as CSV
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No slots or appointments for this day.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => {
            const start = new Date(row.scheduled_start);
            const end = new Date(start.getTime() + row.duration_minutes * 60_000);
            const isSlot = row.patient_id === null && row.status === null;
            return (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-28 shrink-0 font-medium text-slate-900">
                    {formatTime(start)}
                  </span>
                  <span className="text-xs text-slate-400">{formatTime(end)}</span>
                  <div>
                    <p className="text-sm text-slate-800">
                      {isSlot ? (
                        <span className="text-slate-500">Available slot</span>
                      ) : (
                        <Link
                          href={`/appointments/${row.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {row.patient?.full_name ?? 'Unknown patient'}
                        </Link>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={row.status} />
                  <Link
                    href={`/appointments/${row.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {isSlot ? 'Book' : 'View'}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}