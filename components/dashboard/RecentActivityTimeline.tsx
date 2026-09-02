import type { ActivityItem } from '@/lib/dashboard/queries';

interface Props {
  activities: ActivityItem[];
}

export function RecentActivityTimeline({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[#9ca3af]">
        No recent activity logged.
      </div>
    );
  }

  return (
    <div className="relative pl-2">
      <div className="space-y-4">
        {activities.map((item, idx) => (
          <div key={item.id} className="relative flex items-start gap-3 group">
            {/* Timestamp */}
            <span className="w-16 shrink-0 text-[11px] font-medium text-[#9ca3af] tabular-nums pt-0.5">
              {item.timeFormatted}
            </span>

            {/* Timeline bullet and connecting line */}
            <div className="relative flex flex-col items-center">
              <span className="relative z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#3b82f6] bg-white group-hover:bg-[#3b82f6] transition-colors" />
              {idx < activities.length - 1 && (
                <span className="absolute top-3.5 h-full w-px bg-[#f3f4f6]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-2">
              <p className="text-xs font-medium text-[#111111] leading-snug group-hover:text-[#3b82f6] transition-colors">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-[11px] text-[#9ca3af] mt-0.5 truncate">
                  {item.subtitle}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
