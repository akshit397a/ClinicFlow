import Link from 'next/link';
import type { AppointmentListItem } from '@/lib/db/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/lib/utils/dates';

interface Props {
  appointments: AppointmentListItem[];
  role?: 'front_desk' | 'provider';
}

export function PerformanceTable({ appointments, role = 'front_desk' }: Props) {
  if (appointments.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-[#9ca3af]">
        {role === 'provider'
          ? 'No upcoming patient consultations assigned to your queue.'
          : 'No appointments scheduled for upcoming slots.'}
      </div>
    );
  }

  const isProvider = role === 'provider';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#f3f4f6] text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
            <th className="pb-3 pl-1">Id</th>
            <th className="pb-3">Patient</th>
            {!isProvider && <th className="pb-3">Assigned Provider</th>}
            <th className="pb-3">Scheduled Time</th>
            <th className="pb-3">Status</th>
            {isProvider && <th className="pb-3">Visit Action</th>}
            <th className="pb-3 pr-1 text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f8f9fa]">
          {appointments.map((apt, idx) => {
            const patientInitials = (apt.patient?.full_name ?? 'Slot')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            const providerInitials = apt.provider.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <tr key={apt.id} className="hover:bg-[#fafafa] transition-colors group">
                {/* Index / ID */}
                <td className="py-3.5 pl-1 font-semibold text-[#6b7280]">
                  {idx + 1}
                </td>

                {/* Patient Name with Avatar */}
                <td className="py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                      {patientInitials}
                    </div>
                    <div>
                      <p className="font-semibold text-[#111111] leading-tight">
                        {apt.patient?.full_name ?? (
                          <span className="text-[#9ca3af] italic">Available slot</span>
                        )}
                      </p>
                      {apt.patient?.phone && (
                        <p className="text-[10px] text-[#9ca3af] mt-0.5">
                          {apt.patient.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Assigned Provider (Front-desk view) */}
                {!isProvider && (
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-semibold text-violet-700">
                        {providerInitials}
                      </div>
                      <div>
                        <p className="font-medium text-[#374151] leading-tight">
                          {apt.provider.full_name}
                        </p>
                      </div>
                    </div>
                  </td>
                )}

                {/* Time */}
                <td className="py-3.5 text-[#6b7280] font-medium">
                  {formatDateTime(apt.scheduled_start)}
                </td>

                {/* Status Badge */}
                <td className="py-3.5">
                  <StatusBadge status={apt.status} />
                </td>

                {/* Provider specific quick action */}
                {isProvider && (
                  <td className="py-3.5">
                    <Link
                      href={`/appointments/${apt.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-[#111111] text-white px-2.5 py-1 text-[11px] font-medium hover:bg-[#242424] transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                      Document Notes
                    </Link>
                  </td>
                )}

                {/* Action Link */}
                <td className="py-3.5 pr-1 text-right">
                  <Link
                    href={`/appointments/${apt.id}`}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-[#111111] border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors"
                  >
                    View
                    <svg className="w-3 h-3 text-[#9ca3af] group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
