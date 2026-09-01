import type { Patient } from '@/lib/db/types';
import type { PatientsQueryInput } from '@/lib/validation/schemas';
import { prisma } from '@/lib/prisma';
import { buildPage, type Page } from '@/lib/utils/pagination';

export async function listPatients(
  input: PatientsQueryInput,
): Promise<Page<Patient>> {
  const where: any = {};

  if (input.search) {
    where.OR = [
      { fullName: { contains: input.search, mode: 'insensitive' } },
      { email: { contains: input.search, mode: 'insensitive' } },
      { phone: { contains: input.search, mode: 'insensitive' } },
    ];
  }

  const skip = (input.page - 1) * input.pageSize;
  const take = input.pageSize;

  const [rows, totalCount] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { fullName: 'asc' },
      skip,
      take,
    }),
    prisma.patient.count({ where }),
  ]);

  const items: Patient[] = rows.map((p) => ({
    id: p.id,
    full_name: p.fullName,
    email: p.email,
    phone: p.phone,
    date_of_birth: p.dateOfBirth ? p.dateOfBirth.toISOString().split('T')[0] : null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  }));

  return buildPage(items, totalCount, input.page, input.pageSize);
}

export async function getPatient(id: string): Promise<Patient | null> {
  const p = await prisma.patient.findUnique({
    where: { id },
  });

  if (!p) return null;

  return {
    id: p.id,
    full_name: p.fullName,
    email: p.email,
    phone: p.phone,
    date_of_birth: p.dateOfBirth ? p.dateOfBirth.toISOString().split('T')[0] : null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}