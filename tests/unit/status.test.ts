import { describe, expect, it } from 'vitest';
import {
  canTransition,
  isActive,
  isTerminal,
  nextStatuses,
} from '@/lib/appointments/status';
import type { AppointmentStatus } from '@/lib/db/types';

describe('appointment status flow', () => {
  it('allows the documented lifecycle transitions', () => {
    expect(canTransition('requested', 'confirmed')).toBe(true);
    expect(canTransition('requested', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'checked_in')).toBe(true);
    expect(canTransition('confirmed', 'no_show')).toBe(true);
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('checked_in', 'completed')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransition('requested', 'checked_in')).toBe(false);
    expect(canTransition('requested', 'completed')).toBe(false);
    expect(canTransition('checked_in', 'no_show')).toBe(false);
    expect(canTransition('completed', 'requested')).toBe(false);
    expect(canTransition('completed', 'cancelled')).toBe(false);
    expect(canTransition('no_show', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'confirmed')).toBe(false);
  });

  it('never lets a slot be status-transitioned', () => {
    expect(canTransition(null, 'requested')).toBe(false);
    expect(nextStatuses(null)).toEqual([]);
  });

  it('marks completed / no_show / cancelled as terminal', () => {
    for (const s of ['completed', 'no_show', 'cancelled'] as AppointmentStatus[]) {
      expect(isTerminal(s)).toBe(true);
    }
    expect(isTerminal('requested')).toBe(false);
    expect(isTerminal(null)).toBe(false);
  });

  it('marks requested / confirmed / checked_in as active', () => {
    expect(isActive('requested')).toBe(true);
    expect(isActive('confirmed')).toBe(true);
    expect(isActive('checked_in')).toBe(true);
    expect(isActive('completed')).toBe(false);
    expect(isActive(null)).toBe(false);
  });

  it('nextStatuses follows the flow table', () => {
    expect(nextStatuses('confirmed')).toEqual(['checked_in', 'no_show', 'cancelled']);
    expect(nextStatuses('checked_in')).toEqual(['completed']);
    expect(nextStatuses('completed')).toEqual([]);
  });
});