'use client';

interface Props {
  completed: number;
  noShows: number;
  growthPercent?: number;
}

export function DonutBreakupCard({ completed, noShows, growthPercent = 9 }: Props) {
  const total = completed + noShows;
  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 75;

  // SVG Donut calculation: circumference = 2 * PI * r = 2 * 3.14159 * 32 ~= 201
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * completedPct) / 100;

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <h3 className="text-sm font-semibold text-[#111111]">Attendance Breakup</h3>
        <p className="text-xs text-[#6b7280] mt-0.5">Completed visits vs no-shows</p>
      </div>

      <div className="flex items-center justify-between gap-4 my-3">
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-[#111111]">
            {completedPct}%
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 font-bold">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </span>
            <span className="text-xs font-semibold text-[#111111]">+{growthPercent}%</span>
            <span className="text-xs text-[#9ca3af]">completion rate</span>
          </div>
        </div>

        {/* High-Contrast SVG Donut Ring */}
        <div className="relative w-22 h-22 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 88 88">
            {/* Background ring */}
            <circle
              cx="44"
              cy="44"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Foreground completed arc */}
            <circle
              cx="44"
              cy="44"
              r={radius}
              stroke="#111111"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-xs font-bold text-[#111111] leading-none block">
              {completed}
            </span>
            <span className="text-[9px] text-[#9ca3af] leading-none mt-0.5 block">
              done
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-3 border-t border-[#f3f4f6] text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#111111]" />
          <span className="text-[#374151] font-medium">Completed ({completed})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e5e7eb]" />
          <span className="text-[#6b7280]">No-shows ({noShows})</span>
        </div>
      </div>
    </div>
  );
}
