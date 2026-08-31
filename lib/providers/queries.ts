import type { Profile } from '@/lib/db/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function listProviders(): Promise<Profile[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'provider')
    .order('full_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load providers: ${error.message}`);
  }

  return (data ?? []) as Profile[];
}