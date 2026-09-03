'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface Props {
  completed: number;
  noShows: number;
  growthPercent?: number;
}

export function EvilDonutChart({ completed, noShows, growthPercent = 9 }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = completed + noShows;
  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 75;
  const noShowPct = 100 - completedPct;

  const data = [
    { name: 'Completed', value: completed, color: '#111111', pct: completedPct },
    { name: 'No-Shows', value: noShows, color: '#d1d5db', pct: noShowPct },
  ];

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="flex flex-col justify-between h-full space-y-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-[#111111]">
            Attendance Breakup
          </h3>
          <p className="text-xs text-[#6b7280] mt-0.5">Consultation adherence rate</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 transition-transform duration-200 hover:scale-105">
          +{growthPercent}%
        </span>
      </div>

      {/* Main Metric & Donut Chart Row */}
      <div className="flex items-center justify-between gap-3 py-1">
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-[#111111] tabular-nums transition-all duration-200">
            {activeItem ? `${activeItem.pct}%` : `${completedPct}%`}
          </p>
          <p className="text-xs font-medium text-[#6b7280] mt-0.5 transition-colors duration-200">
            {activeItem
              ? `${activeItem.value} ${activeItem.name.toLowerCase()}`
              : `${completed} of ${total} visits attended`}
          </p>
        </div>

        {/* Donut Chart Container */}
        <div className="relative w-28 h-28 shrink-0 group">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                position={{ y: -24, x: 4 }}
                wrapperStyle={{ zIndex: 60, pointerEvents: 'none' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0];
                  const val = Number(item.value ?? 0);
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                  return (
                    <div className="rounded-md border border-[#111111]/15 bg-[#111111] px-2.5 py-1 shadow-xl text-[11px] whitespace-nowrap animate-in fade-in-0 zoom-in-95 duration-150 ease-out">
                      <span className="font-medium text-[#9ca3af]">{item.name}: </span>
                      <span className="font-bold text-white tabular-nums">{val}</span>
                      <span className="text-emerald-400 font-medium ml-1">({pct}%)</span>
                    </div>
                  );
                }}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={hoveredIndex !== null ? 51 : 49}
                paddingAngle={4}
                cornerRadius={4}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                animationDuration={600}
                animationEasing="ease-out"
                onMouseEnter={(_, index) => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {data.map((entry, index) => {
                  const isHovered = hoveredIndex === index;
                  const isOtherHovered = hoveredIndex !== null && !isHovered;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={isOtherHovered ? 0.35 : 1}
                      stroke={isHovered ? '#ffffff' : 'transparent'}
                      strokeWidth={isHovered ? 2 : 0}
                      className="transition-all duration-300 ease-out cursor-pointer outline-none"
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered label inside donut hole with smooth micro-animation */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-transform duration-200 ease-out">
            <span
              className={`text-xs font-bold text-[#111111] leading-none tabular-nums transition-all duration-200 ${
                activeItem ? 'scale-110 text-black' : 'scale-100'
              }`}
            >
              {activeItem ? activeItem.value : completed}
            </span>
            <span className="text-[9px] text-[#6b7280] font-medium leading-none mt-0.5 truncate max-w-[52px] text-center transition-opacity duration-200">
              {activeItem ? activeItem.name : 'visits'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom legend: synchronized interactive pills matching Cal.com tokens */}
      <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6] text-xs relative z-10">
        <button
          type="button"
          onMouseEnter={() => setHoveredIndex(0)}
          onMouseLeave={() => setHoveredIndex(null)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-200 ease-out cursor-pointer ${
            hoveredIndex === 0
              ? 'bg-[#f5f5f5] text-[#111111] font-semibold scale-102 shadow-2xs'
              : 'text-[#6b7280] hover:text-[#111111] hover:bg-[#f8f9fa]'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full bg-[#111111] transition-transform duration-200 ${
              hoveredIndex === 0 ? 'scale-125' : 'scale-100'
            }`}
          />
          <span className="font-medium text-[#111111]">Completed</span>
          <span className="text-[#9ca3af] font-normal tabular-nums">({completed})</span>
        </button>

        <button
          type="button"
          onMouseEnter={() => setHoveredIndex(1)}
          onMouseLeave={() => setHoveredIndex(null)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-200 ease-out cursor-pointer ${
            hoveredIndex === 1
              ? 'bg-[#f5f5f5] text-[#111111] font-semibold scale-102 shadow-2xs'
              : 'text-[#6b7280] hover:text-[#111111] hover:bg-[#f8f9fa]'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full bg-[#d1d5db] transition-transform duration-200 ${
              hoveredIndex === 1 ? 'scale-125 bg-[#9ca3af]' : 'scale-100'
            }`}
          />
          <span className="font-medium">No-Shows</span>
          <span className="text-[#9ca3af] font-normal tabular-nums">({noShows})</span>
        </button>
      </div>
    </div>
  );
}
