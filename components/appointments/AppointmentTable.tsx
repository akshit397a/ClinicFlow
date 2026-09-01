import Link from 'next/link';
import type { AppointmentListItem } from '@/lib/db/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatTime } from '@/lib/utils/dates';

export function AppointmentTable({ rows }: { rows: AppointmentListItem[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-[#f3f4f6]">
          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">Date & Time</th>
          <th className="py-3 pr-5 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">Patient</th>
          <th className="py-3 pr-5 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">Provider</th>
          <th className="py-3 pr-5 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">Status</th>
          <th className="py-3 pr-5" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#fafafa] transition-colors">
            <td className="px-5 py-3.5">
              <p className="font-medium text-[#111111] tabular-nums">{formatTime(row.scheduled_start)}</p>
              <p className="text-xs text-[#9ca3af] mt-0.5">{formatDate(row.scheduled_start)}</p>
            </td>
            <td className="py-3.5 pr-5">
              {row.patient ? (
                <Link
                  href={`/patients/${row.patient.id}`}
                  className="font-medium text-[#111111] hover:underline"
                >
                  {row.patient.full_name}
                </Link>
              ) : (
                <span className="text-[#9ca3af] italic">Available slot</span>
              )}
            </td>
            <td className="py-3.5 pr-5 text-[#374151]">{row.provider.full_name}</td>
            <td className="py-3.5 pr-5">
              <StatusBadge status={row.status} />
            </td>
            <td className="py-3.5 pr-5 text-right">
              <Link
                href={`/appointments/${row.id}`}
                className="text-xs font-medium text-[#6b7280] hover:text-[#111111] transition-colors"
              >
                View →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}