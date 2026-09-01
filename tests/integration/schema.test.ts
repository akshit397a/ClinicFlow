import { describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Integration tests against a real Supabase stack (local `supabase start` or a
 * hosted project). They expect migrations + seed to have been applied.
 *
 * Skipped automatically unless SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_KEY
 * are set:
 *
 *   npx supabase start
 *   $env:SUPABASE_TEST_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_TEST_SERVICE_KEY = "<service_role key from supabase status>"
 *   npm run test:integration
 */

const enabled = Boolean(
  process.env.SUPABASE_TEST_URL && process.env.SUPABASE_TEST_SERVICE_KEY,
);

function admin(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_TEST_URL!,
    process.env.SUPABASE_TEST_SERVICE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function anyProviderId(db: SupabaseClient): Promise<string> {
  const { data } = await db
    .from('profiles')
    .select('id')
    .eq('role', 'provider')
    .limit(1)
    .maybeSingle();
  const row = data as { id: string } | null;
  expect(row, 'seed must contain at least one provider').toBeTruthy();
  return row!.id;
}

describe.skipIf(!enabled)('schema invariants (requires local Supabase)', () => {
  it('rejects overlapping active slots for the same provider', async () => {
    const db = admin();
    const providerId = await anyProviderId(db);
    const base = new Date('2030-01-01T09:00:00Z');

    const first = await db.from('appointments').insert({
      provider_id: providerId,
      scheduled_start: base.toISOString(),
      duration_minutes: 30,
    });
    expect(first.error).toBeNull();
    const firstId = (first.data as { id: string }[] | null)?.[0]?.id as string;

    // Same provider, overlapping time -> exclusion violation (23P01).
    const overlap = await db.from('appointments').insert({
      provider_id: providerId,
      scheduled_start: new Date(base.getTime() + 15 * 60_000).toISOString(),
      duration_minutes: 30,
    });
    expect(overlap.error?.code).toBe('23P01');

    // Adjacent [start, end) is allowed.
    const adjacent = await db.from('appointments').insert({
      provider_id: providerId,
      scheduled_start: new Date(base.getTime() + 30 * 60_000).toISOString(),
      duration_minutes: 30,
    });
    expect(adjacent.error).toBeNull();

    await db.from('appointments').delete().eq('id', firstId);
    const adjacentId = (adjacent.data as { id: string }[] | null)?.[0]?.id as string;
    await db.from('appointments').delete().eq('id', adjacentId);
  });

  it('blocks a cancelled appointment without a reason', async () => {
    const db = admin();
    const providerId = await anyProviderId(db);

    const { error } = await db.from('appointments').insert({
      provider_id: providerId,
      patient_id: null,
      scheduled_start: '2030-01-02T09:00:00Z',
      duration_minutes: 30,
      status: 'cancelled',
      cancellation_reason: null,
    });
    expect(error?.code).toBe('23514'); // check_violation
  });

  it('has no write access for anonymous callers on the audit table', async () => {
    // PostgREST as an anonymous caller: the RLS policy set grants SELECT only.
    const db = createClient(
      process.env.SUPABASE_TEST_URL!,
      process.env.SUPABASE_TEST_ANON_KEY!,
    );
    const { error } = await db
      .from('appointment_audit_events')
      .insert({
        appointment_id: '00000000-0000-0000-0000-000000000000',
        event_type: 'STATUS_CHANGED',
      });
    expect(error).toBeTruthy();
  });
});