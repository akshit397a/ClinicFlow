import { describe, expect, it } from 'vitest';
import { buildPage, getRange, totalPages } from '@/lib/utils/pagination';

describe('pagination helpers', () => {
  it('computes the correct range', () => {
    expect(getRange(1, 20)).toEqual({ from: 0, to: 19 });
    expect(getRange(3, 20)).toEqual({ from: 40, to: 59 });
  });

  it('computes total pages', () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(20, 20)).toBe(1);
    expect(totalPages(21, 20)).toBe(2);
  });

  it('builds a page object', () => {
    const page = buildPage([1, 2], 42, 2, 20);
    expect(page).toEqual({
      rows: [1, 2],
      total: 42,
      page: 2,
      pageSize: 20,
      totalPages: 3,
    });
  });
});