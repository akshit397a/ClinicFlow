'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-auth';
import { prisma } from '@/lib/prisma';
import { toErrorMessage } from '@/lib/utils/errors';
import { fail, ok, type ActionResult } from '@/lib/utils/result';
import { patientSchema, updatePatientSchema, type PatientInput } from '@/lib/validation/schemas';
import { isFrontDesk } from '@/lib/appointments/permissions';

export async function createPatientAction(input: PatientInput): Promise<ActionResult> {
  const user = await requireAuth();
  if (!isFrontDesk(user.profile)) return fail('Only front-desk staff can create patients.');

  const parsed = patientSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid patient details.');

  try {
    await prisma.patient.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        dateOfBirth: parsed.data.dateOfBirth ?? null,
      },
    });

    revalidatePath('/');
    revalidatePath('/patients');
    return ok();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function updatePatientAction(
  input: { patientId: string } & PatientInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  if (!isFrontDesk(user.profile)) return fail('Only front-desk staff can update patients.');

  const parsed = updatePatientSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid patient details.');

  const { patientId, ...fields } = parsed.data;

  try {
    const existing = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!existing) return fail('Patient not found.');

    await prisma.patient.update({
      where: { id: patientId },
      data: {
        fullName: fields.fullName,
        email: fields.email ?? null,
        phone: fields.phone ?? null,
        dateOfBirth: fields.dateOfBirth ?? null,
      },
    });

    revalidatePath('/');
    revalidatePath('/patients');
    revalidatePath(`/patients/${patientId}`);
    return ok();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}