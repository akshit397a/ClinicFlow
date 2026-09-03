import type {
  AppointmentListItem,
  AppointmentWithRelations,
  Profile,
} from '@/lib/db/types';
import type { AppointmentsQueryInput } from '@/lib/validation/schemas';
import { prisma } from '@/lib/prisma';
import { buildPage, type Page } from '@/lib/utils/pagination';
import { addDaysLocal, startOfDayLocal } from '@/lib/utils/dates';

export async function listAppointments(
  input: AppointmentsQueryInput,
  currentUser?: Profile,
): Promise<Page<AppointmentListItem>> {
  const where: any = {};

  if (input.status === 'available') {
    where.patientId = null;
    where.archivedAt = null;
  } else if (input.status) {
    where.status = input.status;
    where.archivedAt = null;
  } else {
    where.archivedAt = null;
  }

  // Enforce server-side provider scoping:
  // Providers can only see appointments where they are primary or supporting provider.
  if (currentUser?.role === 'provider') {
    where.OR = [
      { providerId: currentUser.id },
      { supportingProviders: { some: { providerId: currentUser.id } } },
    ];
  } else if (input.providerId) {
    where.providerId = input.providerId;
  }

  if (input.search) {
    const searchFilter = [
      { patient: { fullName: { contains: input.search, mode: 'insensitive' } } },
      { provider: { fullName: { contains: input.search, mode: 'insensitive' } } },
    ];
    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        { OR: searchFilter },
      ];
      delete where.OR;
    } else {
      where.OR = searchFilter;
    }
  }

  if (input.from || input.to) {
    where.scheduledStart = {};
    if (input.from) where.scheduledStart.gte = input.from;
    if (input.to) where.scheduledStart.lte = input.to;
  }

  const orderBy: any = {};
  if (input.sortBy === 'scheduled_start') {
    orderBy.scheduledStart = input.sortDir;
  } else if (input.sortBy === 'status') {
    orderBy.status = input.sortDir;
  } else if (input.sortBy === 'created_at') {
    orderBy.createdAt = input.sortDir;
  } else if (input.sortBy === 'provider') {
    orderBy.provider = { fullName: input.sortDir };
  } else {
    orderBy.scheduledStart = 'asc';
  }

  const skip = (input.page - 1) * input.pageSize;
  const take = input.pageSize;

  const [rows, totalCount] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        patient: true,
        provider: true,
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  const items: AppointmentListItem[] = rows.map((r) => ({
    id: r.id,
    provider_id: r.providerId,
    patient_id: r.patientId,
    scheduled_start: r.scheduledStart.toISOString(),
    duration_minutes: r.durationMinutes,
    status: r.status as any,
    cancellation_reason: r.cancellationReason,
    archived_at: r.archivedAt ? r.archivedAt.toISOString() : null,
    archived_by: r.archivedById,
    alert_dismissed_at: r.alertDismissedAt ? r.alertDismissedAt.toISOString() : null,
    alert_dismissed_by: r.alertDismissedById,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    patient: r.patient
      ? {
          id: r.patient.id,
          full_name: r.patient.fullName,
          email: r.patient.email,
          phone: r.patient.phone,
          date_of_birth: r.patient.dateOfBirth ? r.patient.dateOfBirth.toISOString().split('T')[0] : null,
          created_at: r.patient.createdAt.toISOString(),
          updated_at: r.patient.updatedAt.toISOString(),
        }
      : null,
    provider: {
      id: r.provider.id,
      email: r.provider.email,
      full_name: r.provider.fullName,
      role: r.provider.role as any,
      created_at: r.provider.createdAt.toISOString(),
      updated_at: r.provider.updatedAt.toISOString(),
    },
  }));

  return buildPage(items, totalCount, input.page, input.pageSize);
}

export async function getAppointment(
  id: string,
): Promise<AppointmentWithRelations | null> {
  const row = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      provider: true,
      supportingProviders: {
        include: {
          provider: true,
        },
      },
      visitNotes: {
        include: {
          authorProvider: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    provider_id: row.providerId,
    patient_id: row.patientId,
    scheduled_start: row.scheduledStart.toISOString(),
    duration_minutes: row.durationMinutes,
    status: row.status as any,
    cancellation_reason: row.cancellationReason,
    archived_at: row.archivedAt ? row.archivedAt.toISOString() : null,
    archived_by: row.archivedById,
    alert_dismissed_at: row.alertDismissedAt ? row.alertDismissedAt.toISOString() : null,
    alert_dismissed_by: row.alertDismissedById,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    patient: row.patient
      ? {
          id: row.patient.id,
          full_name: row.patient.fullName,
          email: row.patient.email,
          phone: row.patient.phone,
          date_of_birth: row.patient.dateOfBirth ? row.patient.dateOfBirth.toISOString().split('T')[0] : null,
          created_at: row.patient.createdAt.toISOString(),
          updated_at: row.patient.updatedAt.toISOString(),
        }
      : null,
    provider: {
      id: row.provider.id,
      email: row.provider.email,
      full_name: row.provider.fullName,
      role: row.provider.role as any,
      created_at: row.provider.createdAt.toISOString(),
      updated_at: row.provider.updatedAt.toISOString(),
    },
    supporting_providers: row.supportingProviders.map((sp) => ({
      id: sp.provider.id,
      email: sp.provider.email,
      full_name: sp.provider.fullName,
      role: sp.provider.role as any,
      created_at: sp.provider.createdAt.toISOString(),
      updated_at: sp.provider.updatedAt.toISOString(),
    })),
    visit_notes: row.visitNotes.map((vn) => ({
      id: vn.id,
      appointment_id: vn.appointmentId,
      author_provider_id: vn.authorProviderId,
      content: vn.content,
      created_at: vn.createdAt.toISOString(),
      updated_at: vn.updatedAt.toISOString(),
      author: {
        id: vn.authorProvider.id,
        email: vn.authorProvider.email,
        full_name: vn.authorProvider.fullName,
        role: vn.authorProvider.role as any,
        created_at: vn.authorProvider.createdAt.toISOString(),
        updated_at: vn.authorProvider.updatedAt.toISOString(),
      },
    })),
  };
}

export async function getDaySchedule(
  providerId: string,
  date: Date,
): Promise<AppointmentListItem[]> {
  const dayStart = startOfDayLocal(date);
  const dayEnd = addDaysLocal(dayStart, 1);

  const rows = await prisma.appointment.findMany({
    where: {
      providerId,
      scheduledStart: {
        gte: dayStart,
        lt: dayEnd,
      },
      archivedAt: null,
    },
    include: {
      patient: true,
      provider: true,
    },
    orderBy: {
      scheduledStart: 'asc',
    },
  });

  return rows.map((r) => ({
    id: r.id,
    provider_id: r.providerId,
    patient_id: r.patientId,
    scheduled_start: r.scheduledStart.toISOString(),
    duration_minutes: r.durationMinutes,
    status: r.status as any,
    cancellation_reason: r.cancellationReason,
    archived_at: r.archivedAt ? r.archivedAt.toISOString() : null,
    archived_by: r.archivedById,
    alert_dismissed_at: r.alertDismissedAt ? r.alertDismissedAt.toISOString() : null,
    alert_dismissed_by: r.alertDismissedById,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    patient: r.patient
      ? {
          id: r.patient.id,
          full_name: r.patient.fullName,
          email: r.patient.email,
          phone: r.patient.phone,
          date_of_birth: r.patient.dateOfBirth ? r.patient.dateOfBirth.toISOString().split('T')[0] : null,
          created_at: r.patient.createdAt.toISOString(),
          updated_at: r.patient.updatedAt.toISOString(),
        }
      : null,
    provider: {
      id: r.provider.id,
      email: r.provider.email,
      full_name: r.provider.fullName,
      role: r.provider.role as any,
      created_at: r.provider.createdAt.toISOString(),
      updated_at: r.provider.updatedAt.toISOString(),
    },
  }));
}

export async function getAppointmentsForPatient(
  patientId: string,
): Promise<AppointmentListItem[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      patientId,
      archivedAt: null,
    },
    include: {
      patient: true,
      provider: true,
    },
    orderBy: {
      scheduledStart: 'desc',
    },
  });

  return rows.map((r) => ({
    id: r.id,
    provider_id: r.providerId,
    patient_id: r.patientId,
    scheduled_start: r.scheduledStart.toISOString(),
    duration_minutes: r.durationMinutes,
    status: r.status as any,
    cancellation_reason: r.cancellationReason,
    archived_at: r.archivedAt ? r.archivedAt.toISOString() : null,
    archived_by: r.archivedById,
    alert_dismissed_at: r.alertDismissedAt ? r.alertDismissedAt.toISOString() : null,
    alert_dismissed_by: r.alertDismissedById,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    patient: r.patient
      ? {
          id: r.patient.id,
          full_name: r.patient.fullName,
          email: r.patient.email,
          phone: r.patient.phone,
          date_of_birth: r.patient.dateOfBirth ? r.patient.dateOfBirth.toISOString().split('T')[0] : null,
          created_at: r.patient.createdAt.toISOString(),
          updated_at: r.patient.updatedAt.toISOString(),
        }
      : null,
    provider: {
      id: r.provider.id,
      email: r.provider.email,
      full_name: r.provider.fullName,
      role: r.provider.role as any,
      created_at: r.provider.createdAt.toISOString(),
      updated_at: r.provider.updatedAt.toISOString(),
    },
  }));
}
