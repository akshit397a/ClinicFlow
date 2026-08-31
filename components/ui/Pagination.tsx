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
    <nav className="flex items-center justify-center gap-1 pt-4 text-sm">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
        >
          Previous
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`rounded-md px-3 py-1.5 ${
            p === page
              ? 'bg-blue-600 text-white'
              : 'border border-slate-300 hover:bg-slate-50'
          }`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
        >
          Next
        </Link>
      )}
    </nav>
  );
}