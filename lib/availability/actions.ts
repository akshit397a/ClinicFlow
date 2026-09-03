'use server';

import { revalidatePath } from 'next/cache';
import { addDays } from 'date-fns';
import { requireAuth } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/prisma';
import { toErrorMessage } from '@/lib/utils/errors';
import { fail } from '@/lib/utils/result';
import { canManageAvailability } from '@/lib/appointments/permissions';
import { validateGenerateAvailability } from '@/lib/availability/validators';
import {
  generateSlots,
  hasCollision,
  type ExistingTimeWindow,
} from '@/lib/availability/generation';
import { recordSlotCreated } from '@/lib/audit/events';

export type GenerateAvailabilityResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string };

export async function generateAvailabilityAction(
  input: unknown,
): Promise<GenerateAvailabilityResult> {
  const user = await requireAuth();

  const validation = validateGenerateAvailability(input);
  if (!validation.ok) return validation;

  const rule = validation.data;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (rule.endDate < today) {
    return fail('Cannot generate availability slots for dates in the past.');
  }

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

  try {
    // Query existing appointments and slots in this date range to detect collisions
    const existingRows = await prisma.appointment.findMany({
      where: {
        providerId: rule.providerId,
        scheduledStart: {
          gte: rule.startDate,
          lt: addDays(rule.endDate, 1),
        },
        archivedAt: null,
      },
      select: {
        scheduledStart: true,
        durationMinutes: true,
      },
    });

    const existingWindows: ExistingTimeWindow[] = existingRows.map((r) => ({
      scheduledStart: r.scheduledStart,
      durationMinutes: r.durationMinutes,
    }));

    let createdCount = 0;
    let skippedCount = 0;

    for (const slot of slots) {
      // Check collision with existing bookings/slots
      if (hasCollision(slot, existingWindows)) {
        skippedCount++;
        continue;
      }

      const created = await prisma.appointment.create({
        data: {
          providerId: slot.provider_id,
          scheduledStart: new Date(slot.scheduled_start),
          durationMinutes: slot.duration_minutes,
          patientId: null,
          status: null,
        },
      });

      // Track newly created slot in memory to prevent collision within the same batch
      existingWindows.push({
        scheduledStart: created.scheduledStart,
        durationMinutes: created.durationMinutes,
      });

      await recordSlotCreated({ appointmentId: created.id, actorId: user.id });
      createdCount++;
    }

    revalidatePath('/');
    revalidatePath('/schedule');
    revalidatePath('/appointments');
    return { ok: true, created: createdCount, skipped: skippedCount };
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}