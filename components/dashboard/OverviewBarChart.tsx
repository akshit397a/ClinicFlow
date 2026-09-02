'use client';

import { useState } from 'react';
import type { NoShowWeek } from '@/lib/dashboard/queries';
import { format } from 'date-fns';

interface Props {
  series: NoShowWeek[];
}

export function OverviewBarChart({ series }: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'no_shows' | 'completed'>('all');

  // Max value across both metrics to scale graph bars nicely
  const maxVal = Math.max(
    1,
    ...series.map((w) => Math.max(w.completed, w.noShows))
  );

  return (
    <div className="flex flex-col justify-between">
      {/* Chart controls and legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'all' ? 'text-[#111111] font-semibold' : 'text-[#6b7280]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#111111]" />
            Completed visits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'all' ? 'text-[#111111] font-semibold' : 'text-[#6b7280]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
            No-shows
          </button>
        </div>

        <div className="inline-flex items-center rounded-lg border border-[#e5e7eb] bg-[#f8f9fa] p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
              activeTab === 'all' ? 'bg-white text-[#111111] shadow-xs' : 'text-[#6b7280] hover:text-[#111111]'
            }`}
          >
            All 8 Weeks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
              activeTab === 'completed' ? 'bg-white text-[#111111] shadow-xs' : 'text-[#6b7280] hover:text-[#111111]'
            }`}
          >
            Completed
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('no_shows')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
              activeTab === 'no_shows' ? 'bg-white text-[#111111] shadow-xs' : 'text-[#6b7280] hover:text-[#111111]'
            }`}
          >
            No-Shows
          </button>
        </div>
      </div>

      {/* Bar graph area with fixed height */}
      <div className="relative pt-2 pb-2">
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 top-3 bottom-8 flex flex-col justify-between pointer-events-none opacity-50">
          <div className="border-b border-dashed border-[#e5e7eb] w-full" />
          <div className="border-b border-dashed border-[#e5e7eb] w-full" />
          <div className="border-b border-dashed border-[#e5e7eb] w-full" />
          <div className="border-b border-[#e5e7eb] w-full" />
        </div>

        {/* The grouped dual bars */}
        <div className="relative flex h-52 items-end justify-between gap-2 sm:gap-3 px-1 sm:px-3">
          {series.map((week) => {
            // Calculate pixel heights based on max container height of 160px
            const chartHeightPx = 160;
            const completedPx = Math.max(6, Math.round((week.completed / maxVal) * chartHeightPx));
            const noShowPx = Math.max(week.noShows > 0 ? 6 : 0, Math.round((week.noShows / maxVal) * chartHeightPx));

            return (
              <div key={week.weekStart} className="flex-1 flex flex-col items-center group justify-end">
                {/* Floating tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 bg-[#111111] text-white text-[10px] font-medium px-2 py-1 rounded shadow-md pointer-events-none z-20 whitespace-nowrap">
                  {week.completed} Completed · {week.noShows} No-shows
                </div>

                <div className="flex items-end gap-1 sm:gap-1.5 w-full max-w-[44px] justify-center h-[160px]">
                  {/* Completed Bar */}
                  {(activeTab === 'all' || activeTab === 'completed') && (
                    <div
                      className="w-1/2 rounded-t-[4px] bg-[#111111] hover:bg-[#333333] transition-all duration-300 relative group-hover:shadow-sm"
                      style={{ height: `${completedPx}px` }}
                      title={`${week.completed} Completed`}
                    />
                  )}

                  {/* No-show Bar */}
                  {(activeTab === 'all' || activeTab === 'no_shows') && (
                    <div
                      className="w-1/2 rounded-t-[4px] bg-[#3b82f6] hover:bg-[#2563eb] transition-all duration-300 relative group-hover:shadow-sm"
                      style={{ height: `${noShowPx}px` }}
                      title={`${week.noShows} No-shows`}
                    />
                  )}
                </div>

                <span className="mt-3 text-[11px] font-medium text-[#9ca3af] tabular-nums group-hover:text-[#111111] transition-colors">
                  {format(new Date(week.weekStart), 'M/d')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
