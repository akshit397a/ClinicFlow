import { format } from 'date-fns';
import type { AppointmentListItem } from '@/lib/db/types';

const HEADERS = ['date', 'start', 'end', 'duration_minutes', 'provider', 'patient', 'status'];

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Pure helper: one day of a provider's schedule rendered as CSV text. */
export function buildScheduleCsv(rows: AppointmentListItem[]): string {
  const lines = [HEADERS.join(',')];

  for (const row of rows) {
    const start = new Date(row.scheduled_start);
    const end = new Date(start.getTime() + row.duration_minutes * 60_000);

    lines.push(
      [
        format(start, 'yyyy-MM-dd'),
        format(start, 'HH:mm'),
        format(end, 'HH:mm'),
        String(row.duration_minutes),
        csvEscape(row.provider.full_name),
        csvEscape(row.patient?.full_name ?? ''),
        row.status ?? 'available',
      ].join(','),
    );
  }

  return lines.join('\n');
}