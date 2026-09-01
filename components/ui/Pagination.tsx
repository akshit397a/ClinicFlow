import Link from 'next/link';

interface PaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1 text-sm">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6] hover:border-[#d1d5db] transition-all"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#f3f4f6] px-3 py-1.5 text-sm font-medium text-[#d1d5db] cursor-not-allowed">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </span>
      )}

      {start > 1 && (
        <>
          <Link href={buildHref(1)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors">1</Link>
          {start > 2 && <span className="px-1 text-[#9ca3af]">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            p === page
              ? 'bg-[#111111] text-white shadow-sm'
              : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111111]'
          }`}
        >
          {p}
        </Link>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-[#9ca3af]">…</span>}
          <Link href={buildHref(totalPages)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors">{totalPages}</Link>
        </>
      )}

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6] hover:border-[#d1d5db] transition-all"
        >
          Next
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#f3f4f6] px-3 py-1.5 text-sm font-medium text-[#d1d5db] cursor-not-allowed">
          Next
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </nav>
  );
}