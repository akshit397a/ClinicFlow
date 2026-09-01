import { describe, expect, it } from 'vitest';
import {
  canAddNote,
  canBookSlot,
  canCancel,
  canDismissAlert,
  canManageAvailability,
  canTransitionStatus,
  isFrontDesk,
} from '@/lib/appointments/permissions';
import type { Profile } from '@/lib/db/types';

const frontDesk: Profile = {
  id: 'fd',
  email: 'fd@clinic.test',
  full_name: 'Front Desk',
  role: 'front_desk',
  created_at: '',
  updated_at: '',
};

const provider: Profile = {
  id: 'prov-a',
  email: 'a@clinic.test',
  full_name: 'Alice',
  role: 'provider',
  created_at: '',
  updated_at: '',
};

const otherProvider: Profile = {
  id: 'prov-b',
  email: 'b@clinic.test',
  full_name: 'Bob',
  role: 'provider',
  created_at: '',
  updated_at: '',
};

const slot = { provider_id: provider.id, patient_id: null, status: null };
const booked = { provider_id: provider.id, patient_id: 'pat', status: 'confirmed' as const };

describe('appointment permissions', () => {
  it('allows front desk to book available slots only', () => {
    expect(canBookSlot(frontDesk, slot)).toBe(true);
    expect(canBookSlot(frontDesk, booked)).toBe(false);
    expect(canBookSlot(provider, slot)).toBe(false);
  });

  it('lets the owning provider and front desk change status', () => {
    expect(canTransitionStatus(provider, booked)).toBe(true);
    expect(canTransitionStatus(frontDesk, booked)).toBe(true);
    expect(canTransitionStatus(otherProvider, booked)).toBe(false);
  });

  it('lets the owning provider and front desk cancel', () => {
    expect(canCancel(provider, booked)).toBe(true);
    expect(canCancel(frontDesk, booked)).toBe(true);
    expect(canCancel(otherProvider, booked)).toBe(false);
  });

  it('only front desk can dismiss alerts', () => {
    expect(canDismissAlert(frontDesk)).toBe(true);
    expect(canDismissAlert(provider)).toBe(false);
  });

  it('lets primary and supporting providers add notes, but not others', () => {
    expect(canAddNote(provider, booked, [])).toBe(true);
    expect(canAddNote(otherProvider, booked, [otherProvider.id])).toBe(true);
    expect(canAddNote(otherProvider, booked, [])).toBe(false);
    expect(canAddNote(frontDesk, booked, [])).toBe(false);
  });

  it('lets providers manage only their own availability', () => {
    expect(canManageAvailability(frontDesk)).toBe(true);
    expect(canManageAvailability(provider, slot)).toBe(true);
    expect(canManageAvailability(otherProvider, slot)).toBe(false);
  });

  it('isFrontDesk checks the role', () => {
    expect(isFrontDesk(frontDesk)).toBe(true);
    expect(isFrontDesk(provider)).toBe(false);
  });
});