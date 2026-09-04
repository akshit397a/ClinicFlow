import { cache } from 'react';
import type { Profile } from '@/lib/db/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * Deduplicated per-request authentication resolver.
 * Wrapping in React cache() ensures that layout.tsx and page.tsx
 * in the same request cycle do not perform redundant Supabase Auth
 * and Prisma database lookups, slashing first-load TTFB.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? profile.email,
    profile: {
      id: profile.id,
      email: profile.email,
      full_name: profile.fullName,
      role: profile.role as Profile['role'],
      created_at: profile.createdAt.toISOString(),
      updated_at: profile.updatedAt.toISOString(),
    },
  };
});