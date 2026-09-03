'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { NoShowWeek } from '@/lib/dashboard/queries';

interface Props {
  series: NoShowWeek[];
}

export function EvilAnalyticsChart({ series }: Props) {
  const [chartMode, setChartMode] = useState<'bar' | 'area'>('bar');
  const [filter, setFilter] = useState<'all' | 'completed' | 'no_shows'>('all');

  // Format data for Recharts
  const data = series.map((item) => ({
    name: item.formattedDate,
    completed: item.completed,
    noShows: item.noShows,
    total: item.completed + item.noShows,
    rate: item.rate,
  }));

  const totalCompleted = series.reduce((acc, s) => acc + s.completed, 0);
  const totalNoShows = series.reduce((acc, s) => acc + s.noShows, 0);
  const completionRate =
    totalCompleted + totalNoShows > 0
      ? Math.round((totalCompleted / (totalCompleted + totalNoShows)) * 100)
      : 80;

  return (
    <div className="flex flex-col justify-between h-full space-y-4">
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Metric Quick Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d1d5db]">
            <span className="h-2 w-2 rounded-full bg-[#111111]" />
            <span>Completed: <span className="tabular-nums">{totalCompleted}</span></span>
            <span className="text-[10px] font-medium text-emerald-600">({completionRate}%)</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d1d5db]">
            <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
            <span>No-shows: <span className="tabular-nums">{totalNoShows}</span></span>
          </div>
        </div>

        {/* View Controls: Mode (Bar vs Area) & Filter */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher: Bar vs Smooth Curve */}
          <div className="inline-flex rounded-lg border border-[#e5e7eb] bg-[#f8f9fa] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              className={`px-2.5 py-1 rounded-md transition-all duration-200 ease-out font-medium cursor-pointer ${
                chartMode === 'bar'
                  ? 'bg-white text-[#111111] shadow-2xs font-semibold'
                  : 'text-[#6b7280] hover:text-[#111111] hover:bg-white/50'
              }`}
            >
              Grouped Bars
            </button>
            <button
              type="button"
              onClick={() => setChartMode('area')}
              className={`px-2.5 py-1 rounded-md transition-all duration-200 ease-out font-medium cursor-pointer ${
                chartMode === 'area'
                  ? 'bg-white text-[#111111] shadow-2xs font-semibold'
                  : 'text-[#6b7280] hover:text-[#111111] hover:bg-white/50'
              }`}
            >
              Smooth Wave
            </button>
          </div>

          {/* Series Filter */}
          <div className="inline-flex rounded-lg border border-[#e5e7eb] bg-[#f8f9fa] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all duration-200 ease-out font-medium cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-[#111111] shadow-2xs font-semibold'
                  : 'text-[#6b7280] hover:text-[#111111] hover:bg-white/50'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-2.5 py-1 rounded-md transition-all duration-200 ease-out font-medium cursor-pointer ${
                filter === 'completed'
                  ? 'bg-white text-[#111111] shadow-2xs font-semibold'
                  : 'text-[#6b7280] hover:text-[#111111] hover:bg-white/50'
              }`}
            >
              Completed
            </button>
            <button
              type="button"
              onClick={() => setFilter('no_shows')}
              className={`px-2.5 py-1 rounded-md transition-all duration-200 ease-out font-medium cursor-pointer ${
                filter === 'no_shows'
                  ? 'bg-white text-[#111111] shadow-2xs font-semibold'
                  : 'text-[#6b7280] hover:text-[#111111] hover:bg-white/50'
              }`}
            >
              No-shows
            </button>
          </div>
        </div>
      </div>

      {/* Chart Visual Surface */}
      <div className="w-full h-[230px] pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="evil-completed-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111111" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#111111" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="evil-noshow-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }}
              allowDecimals={false}
            />

            {/* Glassmorphic EvilCharts Custom Tooltip */}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const completedVal = payload.find((p) => p.dataKey === 'completed')?.value ?? 0;
                const noShowVal = payload.find((p) => p.dataKey === 'noShows')?.value ?? 0;
                const total = Number(completedVal) + Number(noShowVal);
                const rate = total > 0 ? Math.round((Number(completedVal) / total) * 100) : 100;

                return (
                  <div className="rounded-xl border border-[#e5e7eb] bg-white/95 backdrop-blur-md p-3 shadow-xl min-w-[170px] animate-in fade-in-50 zoom-in-95 duration-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                      Week of {label}
                    </p>
                    <div className="mt-2 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 font-medium text-[#111111]">
                          <span className="h-2 w-2 rounded-full bg-[#111111]" />
                          Completed
                        </span>
                        <span className="font-bold text-[#111111] tabular-nums">{completedVal}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 font-medium text-[#3b82f6]">
                          <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                          No-shows
                        </span>
                        <span className="font-bold text-[#3b82f6] tabular-nums">{noShowVal}</span>
                      </div>
                      <div className="pt-2 mt-1 border-t border-[#f3f4f6] flex items-center justify-between text-[11px]">
                        <span className="text-[#6b7280]">Show-up Rate</span>
                        <span className="font-bold text-emerald-600">{rate}%</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {chartMode === 'bar' ? (
              <>
                {(filter === 'all' || filter === 'completed') && (
                  <Bar
                    dataKey="completed"
                    name="Completed Visits"
                    fill="#111111"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={22}
                    animationDuration={600}
                  />
                )}
                {(filter === 'all' || filter === 'no_shows') && (
                  <Bar
                    dataKey="noShows"
                    name="No-Shows"
                    fill="#3b82f6"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={22}
                    animationDuration={600}
                  />
                )}
              </>
            ) : (
              <>
                {(filter === 'all' || filter === 'completed') && (
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed Visits"
                    stroke="#111111"
                    strokeWidth={2.5}
                    fill="url(#evil-completed-gradient)"
                    dot={{ r: 3, fill: '#111111', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#111111', stroke: '#ffffff', strokeWidth: 2 }}
                    animationDuration={600}
                  />
                )}
                {(filter === 'all' || filter === 'no_shows') && (
                  <Area
                    type="monotone"
                    dataKey="noShows"
                    name="No-Shows"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#evil-noshow-gradient)"
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
                    animationDuration={600}
                  />
                )}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
