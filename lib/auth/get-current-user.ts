import type { Profile } from '@/lib/db/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
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
      role: profile.role as any,
      created_at: profile.createdAt.toISOString(),
      updated_at: profile.updatedAt.toISOString(),
    },
  };
}