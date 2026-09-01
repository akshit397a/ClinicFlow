import type { Profile } from '@/lib/db/types';
import { prisma } from '@/lib/prisma';

export async function listProviders(): Promise<Profile[]> {
  const rows = await prisma.profile.findMany({
    where: { role: 'provider' },
    orderBy: { fullName: 'asc' },
  });

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    full_name: r.fullName,
    role: r.role as any,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }));
}