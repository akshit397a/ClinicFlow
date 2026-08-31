import type { Profile } from '@/lib/db/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * Returns the signed-in user and their profile, or null when unauthenticated.
 * Reads go through the authenticated session client (RLS applies).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return { id: user.id, email: user.email ?? '', profile: profile as Profile };
}