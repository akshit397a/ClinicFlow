import {
  addDaysLocal,
  minutesToTime,
  startOfDayLocal,
  timeToMinutes,
} from '@/lib/utils/dates';
import type { GenerateAvailabilityInput } from '@/lib/validation/schemas';

export interface SlotToCreate {
  provider_id: string;
  scheduled_start: string;
  duration_minutes: number;
}

/**
 * Pure function: expands a recurring availability rule into concrete slot rows.
 *
 * For every day in [startDate, endDate] whose ISO weekday (1=Mon .. 7=Sun) is in
 * `weekdays`, slots are placed from startTime to endTime, each of
 * `durationMinutes`, stepped by duration + gap. Slots never cross endTime.
 */
export function generateSlots(input: GenerateAvailabilityInput): SlotToCreate[] {
  const {
    providerId,
    startDate,
    endDate,
    weekdays,
    startTime,
    endTime,
    durationMinutes,
    gapMinutes,
  } = input;

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const step = durationMinutes + gapMinutes;
  const lastDay = startOfDayLocal(endDate);

  const slots: SlotToCreate[] = [];

  for (let day = startOfDayLocal(startDate); day <= lastDay; day = addDaysLocal(day, 1)) {
    const isoDow = day.getDay() === 0 ? 7 : day.getDay();
    if (!weekdays.includes(isoDow)) continue;

    for (let t = startMin; t + durationMinutes <= endMin; t += step) {
      const scheduled = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        Math.floor(t / 60),
        t % 60,
        0,
        0,
      );
      slots.push({
        provider_id: providerId,
        scheduled_start: scheduled.toISOString(),
        duration_minutes: durationMinutes,
      });
    }
  }

  return slots;
}

export interface ExistingTimeWindow {
  scheduledStart: Date | string;
  durationMinutes: number;
}

/**
 * Pure helper: checks if a candidate slot collides with any existing booking/slot.
 * Returns true if there is an overlap: slotStart < existingEnd && slotEnd > existingStart.
 */
export function hasCollision(
  slot: { scheduled_start: string; duration_minutes: number },
  existing: ExistingTimeWindow[],
): boolean {
  const slotStart = new Date(slot.scheduled_start).getTime();
  const slotEnd = slotStart + slot.duration_minutes * 60_000;

  for (const e of existing) {
    const exStart = new Date(e.scheduledStart).getTime();
    const exEnd = exStart + e.durationMinutes * 60_000;
    if (slotStart < exEnd && slotEnd > exStart) {
      return true;
    }
  }
  return false;
}


export function describeRule(input: GenerateAvailabilityInput): string {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = input.weekdays.map((d) => dayNames[d - 1]).join(', ');
  return `${input.durationMinutes} min slots ${minutesToTime(timeToMinutes(input.startTime))}–${minutesToTime(timeToMinutes(input.endTime))} on ${days} (gap ${input.gapMinutes} min)`;
}