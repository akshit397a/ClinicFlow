import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { listProviders } from '@/lib/providers/queries';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';

async function upcomingCount(providerId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .in('status', ['requested', 'confirmed', 'checked_in'])
    .gte('scheduled_start', new Date().toISOString());
  if (error) throw new Error(`Failed to count upcoming appointments: ${error.message}`);
  return count ?? 0;
}

export default async function ProvidersPage() {
  await requireAuth();
  const providers = await listProviders();

  const counts = await Promise.all(
    providers.map(async (p) => ({ providerId: p.id, count: await upcomingCount(p.id) })),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Providers</h1>

      {providers.length === 0 && (
        <p className="text-sm text-slate-500">No providers yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <CardTitle>{provider.full_name}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <p className="text-slate-500">{provider.email}</p>
              <p className="text-slate-700">
                {counts.find((c) => c.providerId === provider.id)?.count ?? 0} upcoming
                appointment{counts.find((c) => c.providerId === provider.id)?.count === 1 ? '' : 's'}
              </p>
              <Link
                href={`/schedule?provider_id=${provider.id}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View schedule
              </Link>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}