import type { AuditEventWithActor } from '@/lib/db/types';
import { formatDateTime } from '@/lib/utils/dates';

function eventText(event: AuditEventWithActor): string {
  switch (event.event_type) {
    case 'STATUS_CHANGED':
      return `Status: ${event.old_status ?? 'available'} → ${event.new_status}`;
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
      return 'Slot archived';
    default:
      return event.event_type;
  }
}

function getEventDot(type: string): string {
  switch (type) {
    case 'CANCELLED': return 'bg-red-500';
    case 'STATUS_CHANGED': return 'bg-blue-500';
    case 'NOTE_ADDED': return 'bg-emerald-500';
    case 'SUPPORTING_PROVIDER_ADDED':
    case 'SUPPORTING_PROVIDER_REMOVED': return 'bg-violet-500';
    default: return 'bg-[#9ca3af]';
  }
}

export function Timeline({ events }: { events: AuditEventWithActor[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-[#9ca3af] text-center py-4">No audit events recorded yet.</p>
    );
  }

  return (
    <ol className="relative space-y-5 pl-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[#f3f4f6]">
      {events.map((event) => (
        <li key={event.id} className="relative flex flex-col gap-0.5">
          {/* Dot */}
          <span className={`absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${getEventDot(event.event_type)}`} />

          <p className="text-sm font-medium text-[#111111] leading-snug">{eventText(event)}</p>
          <p className="text-xs text-[#9ca3af]">
            {formatDateTime(event.created_at)}
            {event.actor && (
              <> · <span className="font-medium text-[#6b7280]">{event.actor.full_name}</span></>
            )}
          </p>
        </li>
      ))}
    </ol>
  );
}