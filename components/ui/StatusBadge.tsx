import type { AppointmentStatus } from '@/lib/db/types';

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; bg: string; text: string; ring: string }
> = {
  requested: {
    label: 'Requested',
    dot: 'bg-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200/60',
  },
  confirmed: {
    label: 'Confirmed',
    dot: 'bg-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-200/60',
  },
  checked_in: {
    label: 'Checked in',
    dot: 'bg-violet-500',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    ring: 'ring-violet-200/60',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200/60',
  },
  no_show: {
    label: 'No show',
    dot: 'bg-red-400',
    bg: 'bg-red-50',
    text: 'text-red-600',
    ring: 'ring-red-200/60',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-slate-400',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    ring: 'ring-slate-200/60',
  },
  available: {
    label: 'Available',
    dot: 'bg-slate-300',
    bg: 'bg-white',
    text: 'text-slate-500',
    ring: 'ring-slate-200',
  },
};

export function statusLabel(status: AppointmentStatus | null): string {
  const key = status === null ? 'available' : status;
  return STATUS_CONFIG[key]?.label ?? String(status);
}

export function StatusBadge({ status }: { status: AppointmentStatus | null }) {
  const key = status === null ? 'available' : status;
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.available;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}