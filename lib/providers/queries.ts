import type { Profile } from '@/lib/db/types';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export const listProviders = unstable_cache(
  async (): Promise<Profile[]> => {
    const rows = await prisma.profile.findMany({
      where: { role: 'provider' },
      orderBy: { fullName: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      full_name: r.fullName,
      role: r.role as Profile['role'],
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    }));
  },
  ['clinic-providers-list'],
  {
    revalidate: 3600,
    tags: ['providers'],
  }
);