'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { toErrorMessage } from '@/lib/utils/errors';
import { fail, ok, type ActionResult } from '@/lib/utils/result';
import { patientSchema, updatePatientSchema, type PatientInput } from '@/lib/validation/schemas';
import { isFrontDesk } from '@/lib/appointments/permissions';

export async function createPatientAction(input: PatientInput): Promise<ActionResult> {
  const user = await requireAuth();
  if (!isFrontDesk(user.profile)) return fail('Only front-desk staff can create patients.');

  const parsed = patientSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid patient details.');

  const admin = createAdminClient();
  const { error } = await admin.from('patients').insert({
    full_name: parsed.data.fullName,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
    date_of_birth: parsed.data.dateOfBirth ? parsed.data.dateOfBirth.toISOString().slice(0, 10) : null,
  });
  if (error) return fail(toErrorMessage(error));

  revalidatePath('/');
  revalidatePath('/patients');
  return ok();
}

export async function updatePatientAction(
  input: { patientId: string } & PatientInput,
): Promise<ActionResult> {
  const user = await requireAuth();
  if (!isFrontDesk(user.profile)) return fail('Only front-desk staff can update patients.');

  const parsed = updatePatientSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid patient details.');

  const { patientId, ...fields } = parsed.data;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();
  if (!existing) return fail('Patient not found.');

  const { error } = await admin
    .from('patients')
    .update({
      full_name: fields.fullName,
      email: fields.email ?? null,
      phone: fields.phone ?? null,
      date_of_birth: fields.dateOfBirth ? fields.dateOfBirth.toISOString().slice(0, 10) : null,
    })
    .eq('id', patientId);
  if (error) return fail(toErrorMessage(error));

  revalidatePath('/');
  revalidatePath('/patients');
  revalidatePath(`/patients/${patientId}`);
  return ok();
}