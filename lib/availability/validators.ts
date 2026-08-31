import { generateAvailabilitySchema, type GenerateAvailabilityInput } from '@/lib/validation/schemas';

export type { GenerateAvailabilityInput };

export type AvailabilityValidation =
  | { ok: true; data: GenerateAvailabilityInput }
  | { ok: false; error: string };

export function validateGenerateAvailability(
  input: unknown,
): AvailabilityValidation {
  const parsed = generateAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? 'Invalid availability rule.' };
  }
  return { ok: true, data: parsed.data };
}