import type { AuditEventWithActor } from '@/lib/db/types';
import { formatDateTime } from '@/lib/utils/dates';

function eventText(event: AuditEventWithActor): string {
  switch (event.event_type) {
    case 'STATUS_CHANGED':
      return `${event.old_status ?? 'available'} → ${event.new_status}`;
    case 'CANCELLED':
      return `Cancelled — ${event.cancellation_reason ?? 'no reason given'}`;
    case 'NOTE_ADDED':
      return 'Visit note added';
    case 'SUPPORTING_PROVIDER_ADDED':
      return `Supporting provider added: ${event.supporting_provider?.full_name ?? 'unknown'}`;
    case 'SUPPORTING_PROVIDER_REMOVED':
      return `Supporting provider removed: ${event.supporting_provider?.full_name ?? 'unknown'}`;
    case 'SLOT_CREATED':
      return 'Available slot created';
    case 'SLOT_ARCHIVED':
      return 'Available slot archived';
    default:
      return event.event_type;
  }
}

export function Timeline({ events }: { events: AuditEventWithActor[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No history yet.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-slate-300 bg-white" />
          <p className="text-sm font-medium text-slate-900">{eventText(event)}</p>
          <p className="text-xs text-slate-500">
            {formatDateTime(event.created_at)} · {event.actor?.full_name ?? 'System'}
          </p>
        </li>
      ))}
    </ol>
  );
}