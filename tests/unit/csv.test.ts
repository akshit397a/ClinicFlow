import { describe, expect, it } from 'vitest';
import { buildScheduleCsv } from '@/lib/csv/schedule';
import type { AppointmentListItem } from '@/lib/db/types';

function row(overrides: Partial<AppointmentListItem>): AppointmentListItem {
  return {
    id: 'a',
    provider_id: 'p',
    patient_id: 'pat',
    scheduled_start: '2026-09-01T13:30:00.000Z',
    duration_minutes: 30,
    status: 'confirmed',
    cancellation_reason: null,
    archived_at: null,
    archived_by: null,
    alert_dismissed_at: null,
    alert_dismissed_by: null,
    created_at: '2026-08-30T10:00:00.000Z',
    updated_at: '2026-08-30T10:00:00.000Z',
    patient: {
      id: 'pat',
      full_name: 'Maya Rodriguez',
      email: null,
      phone: null,
      date_of_birth: null,
      created_at: '',
      updated_at: '',
    },
    provider: {
      id: 'p',
      email: 'provider@clinic.test',
      full_name: 'Alice Smith',
      role: 'provider',
      created_at: '',
      updated_at: '',
    },
    ...overrides,
  } as AppointmentListItem;
}

describe('buildScheduleCsv', () => {
  it('writes a header and one line per row', () => {
    const csv = buildScheduleCsv([row({})]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,start,end,duration_minutes,provider,patient,status');
    expect(lines[1]).toContain('Alice Smith');
    expect(lines[1]).toContain('Maya Rodriguez');
    expect(lines[1]).toContain('confirmed');
  });

  it('marks slots as available', () => {
    const csv = buildScheduleCsv([row({ patient_id: null, patient: null, status: null })]);
    expect(csv.split('\n')[1]).toContain('available');
  });

  it('quotes fields that contain commas or quotes', () => {
    const base = row({});
    const csv = buildScheduleCsv([
      row({
        patient: {
          ...(base.patient as NonNullable<AppointmentListItem['patient']>),
          full_name: 'Smith, John',
        },
      }),
    ]);
    expect(csv.split('\n')[1]).toContain('"Smith, John"');
  });
});