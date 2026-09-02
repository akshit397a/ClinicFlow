import Link from 'next/link';

interface Props {
  role?: 'front_desk' | 'provider';
  unconfirmedCount?: number;
}

export function QuickActionCards({ role = 'front_desk', unconfirmedCount = 0 }: Props) {
  const isProvider = role === 'provider';

  const cards = isProvider
    ? [
        {
          title: 'My Daily Consultation Roster',
          category: 'Schedule',
          badge: 'Today',
          badgeColor: 'bg-violet-100 text-violet-700',
          description:
            'Review all patient visits scheduled with you today. Monitor check-ins, consultation times, and room allocation.',
          ctaText: 'Open Day Schedule',
          ctaHref: '/schedule',
          icon: (
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          ),
        },
        {
          title: 'Clinical Visit Notes & Records',
          category: 'EHR',
          badge: 'Medical Notes',
          badgeColor: 'bg-emerald-100 text-emerald-700',
          description:
            'Document SOAP notes, diagnosis summaries, and treatment plans. Notes are timestamped and signed with your provider identity.',
          ctaText: 'View Appointments',
          ctaHref: '/appointments',
          icon: (
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          ),
        },
        {
          title: 'Patient Directory & History',
          category: 'Directory',
          badge: 'Patients',
          badgeColor: 'bg-blue-100 text-blue-700',
          description:
            'Access comprehensive patient medical records, contact profiles, and longitudinal appointment history.',
          ctaText: 'Browse Patients',
          ctaHref: '/patients',
          icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          ),
        },
      ]
    : [
        {
          title: 'Front Desk Check-in & Calendar',
          category: 'Operations',
          badge: 'Live Roster',
          badgeColor: 'bg-blue-100 text-blue-700',
          description:
            'Manage today’s patient intake, check-ins, waiting room queue, and view provider availability across all clinic rooms.',
          ctaText: 'View Schedule',
          ctaHref: '/schedule',
          icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          title: 'Unconfirmed Alert Escalations',
          category: 'Triage',
          badge: unconfirmedCount > 0 ? `${unconfirmedCount} Pending` : 'Clear',
          badgeColor: unconfirmedCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
          description:
            'Requested appointments scheduled within 24h requiring front desk confirmation. Escalates again at 1h before start time.',
          ctaText: 'Review Alerts',
          ctaHref: '/alerts',
          icon: (
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          ),
        },
        {
          title: 'Bulk Availability & Slot Manager',
          category: 'Scheduling',
          badge: 'Automation',
          badgeColor: 'bg-violet-100 text-violet-700',
          description:
            'Generate bookable consultation slots across date ranges, custom durations, and provider rosters in one click.',
          ctaText: 'Generate Slots',
          ctaHref: '/schedule',
          icon: (
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          ),
        },
      ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((c) => (
        <div
          key={c.title}
          className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f8f9fa] group-hover:scale-105 transition-transform">
                {c.icon}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.badgeColor}`}>
                {c.badge}
              </span>
            </div>

            <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider">
              {c.category}
            </p>
            <h4 className="text-sm font-semibold text-[#111111] mt-0.5 group-hover:text-[#3b82f6] transition-colors">
              {c.title}
            </h4>
            <p className="text-xs text-[#6b7280] mt-2 leading-relaxed">
              {c.description}
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-[#f3f4f6]">
            <Link
              href={c.ctaHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] hover:text-[#3b82f6] transition-colors"
            >
              {c.ctaText}
              <svg className="w-3.5 h-3.5 text-[#6b7280] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
