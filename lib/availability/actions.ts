'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { toErrorMessage } from '@/lib/utils/errors';
import { fail } from '@/lib/utils/result';
import { canManageAvailability } from '@/lib/appointments/permissions';
import { validateGenerateAvailability } from '@/lib/availability/validators';
import { generateSlots } from '@/lib/availability/generation';
import { recordSlotCreated } from '@/lib/audit/events';

export type GenerateAvailabilityResult =
  | { ok: true; created: number }
  | { ok: false; error: string };

export async function generateAvailabilityAction(
  input: unknown,
): Promise<GenerateAvailabilityResult> {
  const user = await requireAuth();

  const validation = validateGenerateAvailability(input);
  if (!validation.ok) return validation;

  const rule = validation.data;

  if (
    user.profile.role === 'provider' &&
    rule.providerId !== user.profile.id
  ) {
    return fail('Providers can only generate availability for themselves.');
  }
  if (!canManageAvailability(user.profile)) {
    return fail('Not authorized to manage availability.');
  }

  const slots = generateSlots(rule);
  if (slots.length === 0) {
    return fail('The rule produced no slots (check weekdays and time range).');
  }

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from('appointments')
    .insert(slots)
    .select('id');
  if (error) return fail(toErrorMessage(error));

  for (const row of inserted ?? []) {
    await recordSlotCreated({ appointmentId: row.id, actorId: user.id });
  }

  revalidatePath('/');
  revalidatePath('/schedule');
  revalidatePath('/appointments');
  return { ok: true, created: slots.length };
}