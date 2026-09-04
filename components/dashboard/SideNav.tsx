'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/appointments',
    label: 'Appointments',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/schedule',
    label: 'Schedule',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/patients',
    label: 'Patients',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/providers',
    label: 'Providers',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: '/alerts',
    label: 'Alerts',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

interface SideNavProps {
  role?: 'front_desk' | 'provider';
}

export function SideNav({ role = 'front_desk' }: SideNavProps) {
  const pathname = usePathname();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const visibleLinks = NAV_LINKS.filter((link) => {
    if (role === 'provider') {
      if (link.href === '/providers' || link.href === '/alerts') return false;
    }
    return true;
  });

  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {visibleLinks.map((link) => {
        const isCurrent =
          link.href === '/'
            ? pathname === '/'
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        const isPending = navigatingTo === link.href && !isCurrent;
        const active = isCurrent || isPending;

        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch={true}
            onClick={() => {
              if (link.href !== pathname) {
                setNavigatingTo(link.href);
              }
            }}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group cursor-pointer ${
              active
                ? isPending
                  ? 'bg-[#111111]/85 text-white shadow-xs'
                  : 'bg-[#111111] text-white shadow-xs'
                : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111111]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`${active ? 'text-white' : 'text-[#9ca3af] group-hover:text-[#374151]'} transition-colors`}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </div>

            {isPending && (
              <span className="h-2.5 w-2.5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}