'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { dismissAlertAction } from '@/lib/appointments/actions';

interface AlertRow {
  id: string;
  patientName: string;
  providerName: string;
  scheduledStart: string;
}

interface Props {
  alerts: AlertRow[];
  canDismiss: boolean;
}

export function AlertList({ alerts, canDismiss }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-6 w-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#374151]">All clear!</p>
        <p className="mt-1 text-xs text-[#9ca3af]">
          No unconfirmed appointments within the next 24 hours.
        </p>
      </div>
    );
  }

  function dismiss(id: string) {
    startTransition(async () => {
      const result = await dismissAlertAction({ appointmentId: id });
      if (result.ok) router.refresh();
    });
  }

  return (
    <ul className="divide-y divide-[#f3f4f6]">
      {alerts.map((alert) => (
        <li key={alert.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#fafafa] transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            {/* Alert indicator dot */}
            <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/appointments/${alert.id}`}
                className="text-sm font-semibold text-[#111111] hover:underline truncate block"
              >
                {alert.patientName}
              </Link>
              <p className="text-xs text-[#6b7280] mt-0.5 truncate">
                {alert.providerName} · {alert.scheduledStart}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/appointments/${alert.id}`}
              className="text-xs font-medium text-[#6b7280] hover:text-[#111111] transition-colors"
            >
              View →
            </Link>
            {canDismiss && (
              <button
                type="button"
                disabled={pending}
                onClick={() => dismiss(alert.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#f3f4f6] hover:border-[#d1d5db] disabled:opacity-50 transition-all cursor-pointer"
              >
                {pending ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                Dismiss
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}