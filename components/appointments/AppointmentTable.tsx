import Link from 'next/link';
import type { AppointmentListItem } from '@/lib/db/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTime } from '@/lib/utils/dates';

export function AppointmentTable({ rows }: { rows: AppointmentListItem[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <th className="py-2 pr-4">Time</th>
          <th className="py-2 pr-4">Patient</th>
          <th className="py-2 pr-4">Provider</th>
          <th className="py-2 pr-4">Status</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
            <td className="py-2.5 pr-4 font-medium text-slate-900">
              {formatTime(row.scheduled_start)}
            </td>
            <td className="py-2.5 pr-4 text-slate-700">
              {row.patient ? (
                <Link
                  href={`/patients/${row.patient.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {row.patient.full_name}
                </Link>
              ) : (
                <span className="text-slate-400">Available slot</span>
              )}
            </td>
            <td className="py-2.5 pr-4 text-slate-700">{row.provider.full_name}</td>
            <td className="py-2.5 pr-4">
              <StatusBadge status={row.status} />
            </td>
            <td className="py-2.5 text-right">
              <Link
                href={`/appointments/${row.id}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}