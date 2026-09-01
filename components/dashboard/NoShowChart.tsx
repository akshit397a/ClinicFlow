'use client';

import type { NoShowWeek } from '@/lib/dashboard/queries';
import { format } from 'date-fns';

export function NoShowChart({ series }: { series: NoShowWeek[] }) {
  const maxNoShows = Math.max(1, ...series.map((w) => w.noShows));
  const totalCompleted = series.reduce((sum, w) => sum + w.completed, 0);
  const totalNoShows = series.reduce((sum, w) => sum + w.noShows, 0);
  const rate =
    totalCompleted + totalNoShows > 0
      ? Math.round((totalNoShows / (totalCompleted + totalNoShows)) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex gap-6">
        <div>
          <p className="text-2xl font-bold text-[#111111]">{totalNoShows}</p>
          <p className="text-xs text-[#6b7280]">Total no-shows</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#111111]">{rate}%</p>
          <p className="text-xs text-[#6b7280]">No-show rate</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#111111]">{totalCompleted}</p>
          <p className="text-xs text-[#6b7280]">Completed</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex h-32 items-end gap-2">
        {series.map((week) => {
          const barPct = Math.round((week.noShows / maxNoShows) * 100);
          const isHigh = week.noShows >= maxNoShows * 0.7;
          return (
            <div key={week.weekStart} className="flex flex-1 flex-col items-center gap-1 group">
              <span className="text-[10px] font-semibold text-[#374151] opacity-0 group-hover:opacity-100 transition-opacity">
                {week.noShows}
              </span>
              <div
                className={`w-full rounded-t-md transition-all duration-200 group-hover:opacity-80 ${
                  isHigh ? 'bg-[#ef4444]' : 'bg-[#f87171]'
                }`}
                style={{ height: `${Math.max(barPct, 4)}%` }}
                title={`Week of ${format(new Date(week.weekStart), 'MMM d')}: ${week.noShows} no-shows, ${week.completed} completed`}
              />
              <span className="text-[9px] text-[#9ca3af] tabular-nums">
                {format(new Date(week.weekStart), 'M/d')}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#9ca3af]">Weekly no-shows — last 8 weeks</p>
    </div>
  );
}