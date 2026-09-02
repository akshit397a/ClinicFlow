'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface Props {
  completed: number;
  noShows: number;
  growthPercent?: number;
}

export function EvilDonutChart({ completed, noShows, growthPercent = 9 }: Props) {
  const total = completed + noShows;
  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 75;
  const noShowPct = 100 - completedPct;

  const data = [
    { name: 'Completed', value: completed, color: '#111111' },
    { name: 'No-Shows', value: noShows, color: '#e5e7eb' },
  ];

  return (
    <div className="flex flex-col justify-between h-full space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#111111]">Attendance Breakup</h3>
          <p className="text-xs text-[#6b7280] mt-0.5">Consultation adherence rate</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          +{growthPercent}%
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 py-1">
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-[#111111]">
            {completedPct}%
          </p>
          <p className="text-xs font-medium text-[#6b7280] mt-0.5">
            {completed} of {total} visits attended
          </p>
        </div>

        {/* Recharts Pie / Donut Chart */}
        <div className="relative w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0];
                  return (
                    <div className="rounded-lg border border-[#e5e7eb] bg-white/95 backdrop-blur-sm px-2.5 py-1.5 shadow-md text-xs">
                      <span className="font-semibold text-[#111111]">{item.name}: </span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  );
                }}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={50}
                paddingAngle={4}
                cornerRadius={4}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                animationDuration={600}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered label inside donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs font-bold text-[#111111] leading-none">
              {completed}
            </span>
            <span className="text-[9px] text-[#9ca3af] leading-none mt-0.5">
              visits
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-[#f3f4f6] text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#111111]" />
          <span className="font-medium text-[#111111]">Completed</span>
          <span className="text-[#9ca3af]">({completed})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#e5e7eb]" />
          <span className="text-[#6b7280]">No-Shows</span>
          <span className="text-[#9ca3af]">({noShows})</span>
        </div>
      </div>
    </div>
  );
}
