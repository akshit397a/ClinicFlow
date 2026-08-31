import type { NoShowWeek } from '@/lib/dashboard/queries';
import { format } from 'date-fns';

export function NoShowChart({ series }: { series: NoShowWeek[] }) {
  const max = Math.max(1, ...series.map((w) => w.noShows));

  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {series.map((week) => (
          <div key={week.weekStart} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-medium text-slate-600">{week.noShows}</span>
            <div
              className="w-full max-w-10 rounded-t bg-red-400"
              style={{ height: `${Math.round((week.noShows / max) * 100)}px` }}
              title={`${week.noShows} no-shows, ${week.completed} completed`}
            />
            <span className="text-[10px] text-slate-400">
              {format(new Date(week.weekStart), 'MM/dd')}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        No-shows per week (last 8 weeks). Completed visits:{" "}
        {series.reduce((sum, w) => sum + w.completed, 0)}.
      </p>
    </div>
  );
}