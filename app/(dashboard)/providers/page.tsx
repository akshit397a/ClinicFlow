import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-auth';
import { listProviders } from '@/lib/providers/queries';
import { prisma } from '@/lib/prisma';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';

async function upcomingCount(providerId: string): Promise<number> {
  return await prisma.appointment.count({
    where: {
      providerId,
      status: { in: ['requested', 'confirmed', 'checked_in'] },
      scheduledStart: { gte: new Date() },
      archivedAt: null,
    },
  });
}

export default async function ProvidersPage() {
  const user = await requireAuth();
  if (user.profile.role !== 'front_desk') {
    redirect('/');
  }

  const providers = await listProviders();

  const counts = await Promise.all(
    providers.map(async (p) => ({ providerId: p.id, count: await upcomingCount(p.id) })),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Providers Directory</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Manage and review clinical provider schedules and patient load
        </p>
      </div>

      {providers.length === 0 && (
        <p className="text-sm text-slate-500">No providers found.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => {
          const count = counts.find((c) => c.providerId === provider.id)?.count ?? 0;
          return (
            <Card key={provider.id}>
              <CardHeader>
                <CardTitle>{provider.full_name}</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <p className="text-xs text-[#6b7280]">{provider.email}</p>
                <div className="rounded-lg bg-[#fafafa] border border-[#f3f4f6] p-2.5">
                  <span className="text-lg font-bold text-[#111111]">{count}</span>
                  <p className="text-xs text-[#6b7280]">Upcoming active appointments</p>
                </div>
                <Link
                  href={`/schedule?provider_id=${provider.id}`}
                  className="inline-flex items-center text-xs font-semibold text-[#111111] hover:underline pt-1"
                >
                  View full schedule →
                </Link>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}