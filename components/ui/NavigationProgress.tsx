'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // When pathname or searchParams change, navigation has completed
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Listen to click events on anchor links to trigger instant progress bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('/#') &&
        !target.getAttribute('download') &&
        target.getAttribute('target') !== '_blank'
      ) {
        // Only trigger if navigating to a different path
        if (href !== window.location.pathname) {
          setLoading(true);
        }
      }
    }

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-[#f3f4f6] overflow-hidden pointer-events-none">
      <div className="h-full bg-[#111111] animate-[progress_1s_ease-in-out_infinite] w-1/3" />
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(150%);
          }
          100% {
            transform: translateX(350%);
          }
        }
      `}</style>
    </div>
  );
}
