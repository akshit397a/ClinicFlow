import type { AppointmentStatus } from '@/lib/db/types';

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  completed: 'Completed',
  no_show: 'No show',
  cancelled: 'Cancelled',
  available: 'Available',
};

const STATUS_CLASSES: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-violet-100 text-violet-800',
  completed: 'bg-emerald-100 text-emerald-800',
  no_show: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
  available: 'bg-slate-100 text-slate-600',
};

export function statusLabel(status: AppointmentStatus | null): string {
  if (status === null) return STATUS_LABELS.available;
  return STATUS_LABELS[status] ?? status;
}

export function StatusBadge({ status }: { status: AppointmentStatus | null }) {
  const key = status === null ? 'available' : status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[key]}`}
    >
      {statusLabel(status)}
    </span>
  );
}