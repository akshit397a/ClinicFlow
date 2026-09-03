'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface Props {
  totalAppointments: number;
  monthlyGrowthPercent?: number;
}

export function EvilSparklineWave({
  totalAppointments,
  monthlyGrowthPercent = 14,
}: Props) {
  // Smooth synthetic wave data for sparkline trend curve
  const waveData = [
    { day: 'W1', value: Math.round(totalAppointments * 0.12) },
    { day: 'W2', value: Math.round(totalAppointments * 0.18) },
    { day: 'W3', value: Math.round(totalAppointments * 0.14) },
    { day: 'W4', value: Math.round(totalAppointments * 0.22) },
    { day: 'W5', value: Math.round(totalAppointments * 0.19) },
    { day: 'W6', value: Math.round(totalAppointments * 0.26) },
    { day: 'W7', value: Math.round(totalAppointments * 0.24) },
    { day: 'W8', value: Math.round(totalAppointments * 0.31) },
  ];

  return (
    <div className="flex flex-col justify-between h-full space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-[#111111]">Monthly Volume</h3>
          <p className="text-xs text-[#6b7280] mt-0.5">Booked clinical consultations</p>
        </div>

        {/* Currency/Calendar Icon Bubble matching Modernize blue circle button */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-xs transition-transform duration-200 ease-out hover:scale-110 hover:-rotate-3 cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
      </div>

      <div className="py-1">
        <p className="text-3xl font-extrabold tracking-tight text-[#111111] tabular-nums">
          {totalAppointments}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 font-bold">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </span>
          <span className="text-xs font-semibold text-[#111111]">+{monthlyGrowthPercent}%</span>
          <span className="text-xs text-[#9ca3af]">vs last month</span>
        </div>
      </div>

      {/* Recharts Animated Area Sparkline */}
      <div className="h-14 w-full -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={waveData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="evil-spark-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="rounded-md border border-[#e5e7eb] bg-white/95 px-2 py-1 shadow-sm text-[11px] font-semibold text-[#111111]">
                    {payload[0].value} visits
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#evil-spark-grad)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
