export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function buildPage<T>(
  rows: T[],
  total: number,
  page: number,
  pageSize: number,
): Page<T> {
  return { rows, total, page, pageSize, totalPages: totalPages(total, pageSize) };
}