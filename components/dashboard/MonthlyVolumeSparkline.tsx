'use client';

interface Props {
  totalAppointments: number;
  monthlyGrowthPercent?: number;
}

export function MonthlyVolumeSparkline({
  totalAppointments,
  monthlyGrowthPercent = 9,
}: Props) {
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#111111]">Monthly Volume</h3>
          <p className="text-xs text-[#6b7280] mt-0.5">Total booked consultations</p>
        </div>

        {/* Currency/Calendar Icon Bubble matching Modernize blue circle button */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
      </div>

      <div className="my-2">
        <p className="text-3xl font-extrabold tracking-tight text-[#111111]">
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

      {/* Prominent Sparkline Wave Chart with gradient fill */}
      <div className="h-14 w-full overflow-hidden pt-1">
        <svg
          viewBox="0 0 300 70"
          className="w-full h-full overflow-visible"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d="M0 45 C 50 15, 80 55, 130 25 C 180 0, 230 40, 300 20 L 300 70 L 0 70 Z"
            fill="url(#wave-gradient)"
          />

          {/* Line stroke */}
          <path
            d="M0 45 C 50 15, 80 55, 130 25 C 180 0, 230 40, 300 20"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Active indicator dot at end of wave */}
          <circle cx="300" cy="20" r="4" fill="#3b82f6" />
          <circle cx="300" cy="20" r="7" fill="#3b82f6" fillOpacity="0.3" />
        </svg>
      </div>
    </div>
  );
}
