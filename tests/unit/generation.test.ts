import { describe, expect, it } from 'vitest';
import { generateSlots } from '@/lib/availability/generation';
import type { GenerateAvailabilityInput } from '@/lib/validation/schemas';

const providerId = '11111111-1111-1111-1111-111111111111';

// 2026-09-01 is a Tuesday (day 2), 2026-09-02 a Wednesday (day 3).
const TUE = new Date(2026, 8, 1);
const WED = new Date(2026, 8, 2);

function baseInput(overrides: Partial<GenerateAvailabilityInput> = {}): GenerateAvailabilityInput {
  return {
    providerId,
    startDate: TUE,
    endDate: TUE,
    weekdays: [2],
    startTime: '09:00',
    endTime: '10:00',
    durationMinutes: 30,
    gapMinutes: 0,
    ...overrides,
  };
}

describe('generateSlots', () => {
  it('generates consecutive slots within the time window on the matching day', () => {
    const slots = generateSlots(baseInput());
    expect(slots).toHaveLength(2);
    expect(slots[0].scheduled_start).toBe(new Date(2026, 8, 1, 9, 0, 0, 0).toISOString());
    expect(slots[1].scheduled_start).toBe(new Date(2026, 8, 1, 9, 30, 0, 0).toISOString());
  });

  it('respects the weekday filter', () => {
    const tue = generateSlots(baseInput({ weekdays: [2], endDate: WED }));
    const wed = generateSlots(baseInput({ weekdays: [3], endDate: WED }));
    expect(tue).toHaveLength(2);
    expect(new Date(tue[0].scheduled_start).getDay()).toBe(2);
    expect(wed).toHaveLength(2);
    expect(new Date(wed[0].scheduled_start).getDay()).toBe(3);
  });

  it('applies gap minutes between slots', () => {
    const slots = generateSlots(baseInput({ gapMinutes: 15, endTime: '10:30' }));
    const start = new Date(slots[0].scheduled_start).getTime();
    const next = new Date(slots[1].scheduled_start).getTime();
    expect(next - start).toBe(45 * 60_000); // 30 min slot + 15 min gap
  });

  it('never creates a slot that crosses the end time', () => {
    const slots = generateSlots(baseInput({ startTime: '09:00', endTime: '09:40', durationMinutes: 30 }));
    expect(slots).toHaveLength(1); // 09:30 would cross the 09:40 end
    expect(slots[0].scheduled_start).toBe(new Date(2026, 8, 1, 9, 0, 0, 0).toISOString());
  });

  it('returns an empty array for an empty weekday set', () => {
    expect(generateSlots(baseInput({ weekdays: [] }))).toHaveLength(0);
  });
});