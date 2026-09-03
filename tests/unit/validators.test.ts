import { describe, expect, it } from 'vitest';
import {
  validateBooking,
  validateCancellation,
  validateDismissal,
  validateSlotArchive,
  validateTransition,
} from '@/lib/appointments/validators';

const slot = { provider_id: 'p', patient_id: null, status: null };
const requested = { provider_id: 'p', patient_id: 'x', status: 'requested' as const };
const confirmed = { provider_id: 'p', patient_id: 'x', status: 'confirmed' as const };
const completed = { provider_id: 'p', patient_id: 'x', status: 'completed' as const };

describe('appointment validators', () => {
  it('only validates booking on an available slot', () => {
    expect(validateBooking(slot).ok).toBe(true);
    expect(validateBooking(requested).ok).toBe(false);
  });

  it('rejects booking slots whose scheduled time is in the past', () => {
    const pastSlot = { ...slot, scheduled_start: new Date(Date.now() - 3600_000).toISOString() };
    const futureSlot = { ...slot, scheduled_start: new Date(Date.now() + 3600_000).toISOString() };

    const pastResult = validateBooking(pastSlot);
    expect(pastResult.ok).toBe(false);
    expect((pastResult as any).error).toContain('in the past');

    const futureResult = validateBooking(futureSlot);
    expect(futureResult.ok).toBe(true);
  });

  it('validates status transitions', () => {
    expect(validateTransition('requested', 'confirmed').ok).toBe(true);
    expect(validateTransition('confirmed', 'checked_in').ok).toBe(true);
    expect(validateTransition('requested', 'completed').ok).toBe(false);
    expect(validateTransition(null, 'requested').ok).toBe(false);
  });

  it('only allows marking No Show after scheduled time has passed', () => {
    const past = new Date(Date.now() - 3600_000);
    const future = new Date(Date.now() + 3600_000);

    expect(validateTransition('confirmed', 'no_show', { scheduledStart: past }).ok).toBe(true);
    const futureCheck = validateTransition('confirmed', 'no_show', { scheduledStart: future });
    expect(futureCheck.ok).toBe(false);
    expect((futureCheck as any).error).toContain('before its scheduled time has passed');
  });

  it('only allows cancelling requested or confirmed appointments', () => {
    expect(validateCancellation(requested).ok).toBe(true);
    expect(validateCancellation(confirmed).ok).toBe(true);
    expect(validateCancellation(completed).ok).toBe(false);
  });

  it('only allows dismissing requested appointments', () => {
    expect(validateDismissal(requested).ok).toBe(true);
    expect(validateDismissal(confirmed).ok).toBe(false);
  });

  it('only allows archiving slots', () => {
    expect(validateSlotArchive(slot).ok).toBe(true);
    expect(validateSlotArchive(requested).ok).toBe(false);
  });
});