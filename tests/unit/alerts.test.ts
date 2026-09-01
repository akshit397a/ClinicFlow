import { describe, expect, it } from 'vitest';
import { isUnconfirmedAlert } from '@/lib/alerts/queries';

const now = new Date('2026-09-01T12:00:00Z');

function iso(hoursFromNow: number): string {
  return new Date(now.getTime() + hoursFromNow * 3_600_000).toISOString();
}

describe('unconfirmed alert rule', () => {
  it('alerts on a requested appointment within 24 hours that is not dismissed', () => {
    expect(
      isUnconfirmedAlert(
        { status: 'requested', scheduled_start: iso(2), alert_dismissed_at: null },
        now,
      ),
    ).toBe(true);
  });

  it('does not alert on non-requested statuses', () => {
    for (const status of ['confirmed', 'checked_in', 'completed', 'no_show', 'cancelled']) {
      expect(
        isUnconfirmedAlert(
          { status: status as never, scheduled_start: iso(2), alert_dismissed_at: null },
          now,
        ),
      ).toBe(false);
    }
  });

  it('does not alert on available slots', () => {
    expect(
      isUnconfirmedAlert({ status: null, scheduled_start: iso(2), alert_dismissed_at: null }, now),
    ).toBe(false);
  });

  it('does not alert on appointments further than 24 hours out', () => {
    expect(
      isUnconfirmedAlert(
        { status: 'requested', scheduled_start: iso(25), alert_dismissed_at: null },
        now,
      ),
    ).toBe(false);
  });

  it('does not alert on appointments in the past', () => {
    expect(
      isUnconfirmedAlert(
        { status: 'requested', scheduled_start: iso(-1), alert_dismissed_at: null },
        now,
      ),
    ).toBe(false);
  });

  it('suppresses a dismissed alert while more than an hour remains', () => {
    expect(
      isUnconfirmedAlert(
        {
          status: 'requested',
          scheduled_start: iso(5),
          alert_dismissed_at: now.toISOString(),
        },
        now,
      ),
    ).toBe(false);
  });

  it('reappears within one hour of start regardless of dismissal', () => {
    expect(
      isUnconfirmedAlert(
        {
          status: 'requested',
          scheduled_start: iso(0.5),
          alert_dismissed_at: now.toISOString(),
        },
        now,
      ),
    ).toBe(true);
  });

  it('alerts when not dismissed even if exactly at the 24h boundary', () => {
    expect(
      isUnconfirmedAlert(
        { status: 'requested', scheduled_start: iso(24), alert_dismissed_at: null },
        now,
      ),
    ).toBe(true);
  });
});