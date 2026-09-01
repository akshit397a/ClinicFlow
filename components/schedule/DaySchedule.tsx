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

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f4f6]">
          <svg className="h-6 w-6 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#374151]">No slots for this day</p>
        <p className="mt-1 text-xs text-[#9ca3af]">Generate availability slots below to get started</p>
      </div>
    );
  }

  return (
    <div>
      {/* CSV export */}
      <div className="flex items-center justify-between border-b border-[#f3f4f6] px-5 py-3">
        <p className="text-xs text-[#9ca3af]">{rows.length} slot{rows.length === 1 ? '' : 's'}</p>
        <a
          href={csvHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6b7280] hover:text-[#111111] transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </a>
      </div>

      <ul className="divide-y divide-[#f3f4f6]">
        {rows.map((row) => {
          const start = new Date(row.scheduled_start);
          const end = new Date(start.getTime() + row.duration_minutes * 60_000);
          const isSlot = row.patient_id === null && row.status === null;

          return (
            <li
              key={row.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[#fafafa] transition-colors"
            >
              {/* Time block */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-[#111111] tabular-nums text-sm">{formatTime(start)}</p>
                  <p className="text-xs text-[#9ca3af] tabular-nums">{formatTime(end)}</p>
                </div>

                {/* Vertical divider */}
                <div className={`h-8 w-0.5 shrink-0 rounded-full ${isSlot ? 'bg-[#e5e7eb]' : 'bg-[#111111]'}`} />

                {/* Patient name */}
                <div className="min-w-0">
                  {isSlot ? (
                    <span className="text-sm text-[#9ca3af] italic">Available slot</span>
                  ) : (
                    <Link
                      href={`/appointments/${row.id}`}
                      className="text-sm font-medium text-[#111111] hover:underline truncate block"
                    >
                      {row.patient?.full_name ?? 'Unknown patient'}
                    </Link>
                  )}
                </div>
              </div>

              {/* Status + action */}
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={row.status} />
                <Link
                  href={`/appointments/${row.id}`}
                  className={`text-xs font-medium transition-colors ${
                    isSlot
                      ? 'rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 text-[#374151] hover:border-[#111111] hover:text-[#111111]'
                      : 'text-[#6b7280] hover:text-[#111111]'
                  }`}
                >
                  {isSlot ? 'Book' : 'View →'}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}