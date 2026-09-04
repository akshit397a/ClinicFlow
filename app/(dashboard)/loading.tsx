import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-[#e5e7eb] rounded-lg" />
          <div className="h-4 w-72 bg-[#f3f4f6] rounded-md" />
        </div>
        <div className="h-9 w-28 bg-[#e5e7eb] rounded-lg" />
      </div>

      {/* Hero Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-[#e5e7eb] rounded" />
              <div className="h-7 w-7 bg-[#f3f4f6] rounded-lg" />
            </div>
            <div className="h-8 w-16 bg-[#111111]/10 rounded" />
            <div className="h-2 w-full bg-[#f3f4f6] rounded-full" />
            <div className="h-3 w-32 bg-[#f3f4f6] rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-4">
          <div className="h-5 w-36 bg-[#e5e7eb] rounded" />
          <div className="h-8 w-24 bg-[#f3f4f6] rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[#f8f9fa] last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#e5e7eb]" />
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-[#e5e7eb] rounded" />
                  <div className="h-3 w-20 bg-[#f3f4f6] rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-[#f3f4f6] rounded-full" />
              <div className="h-4 w-28 bg-[#f3f4f6] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
