import type { Patient } from '@/lib/db/types';
import type { PatientsQueryInput } from '@/lib/validation/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildPage, getRange, type Page } from '@/lib/utils/pagination';

/** Escape PostgREST filter metacharacters so user input cannot break `.or()`. */
function escapeFilter(value: string): string {
  return value.replace(/[\\%,_]/g, (ch) => `\\${ch}`);
}

export async function listPatients(
  input: PatientsQueryInput,
): Promise<Page<Patient>> {
  const supabase = await createServerSupabaseClient();

  let query = supabase.from('patients').select('*', { count: 'exact' });

  if (input.search) {
    query = query.ilike('full_name', `%${escapeFilter(input.search)}%`);
  }

  const { from, to } = getRange(input.page, input.pageSize);
  query = query.order('full_name', { ascending: true }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to load patients: ${error.message}`);
  }

  return buildPage((data ?? []) as Patient[], count ?? 0, input.page, input.pageSize);
}

export async function getPatient(id: string): Promise<Patient | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load patient: ${error.message}`);
  }

  return (data as Patient | null) ?? null;
}