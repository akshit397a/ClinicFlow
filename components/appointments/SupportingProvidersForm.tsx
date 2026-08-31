'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  assignSupportingProviderAction,
  removeSupportingProviderAction,
} from '@/lib/appointments/actions';
import type { Profile } from '@/lib/db/types';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/fields';

interface Props {
  appointmentId: string;
  primaryProviderId: string;
  currentProviderIds: string[];
  providers: Profile[];
  canManage: boolean;
}

export function SupportingProvidersForm({
  appointmentId,
  primaryProviderId,
  currentProviderIds,
  providers,
  canManage,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [providerId, setProviderId] = useState('');

  const assignable = providers.filter(
    (p) => p.id !== primaryProviderId && !currentProviderIds.includes(p.id),
  );

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? 'Something went wrong.');
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {currentProviderIds.length === 0 && (
        <p className="text-sm text-slate-500">No supporting providers assigned.</p>
      )}
      <ul className="space-y-2">
        {currentProviderIds.map((id) => {
          const provider = providers.find((p) => p.id === id);
          return (
            <li key={id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-700">{provider?.full_name ?? 'Unknown'}</span>
              {canManage && (
                <Button
                  variant="ghost"
                  loading={pending}
                  onClick={() =>
                    run(() =>
                      removeSupportingProviderAction({
                        appointmentId,
                        providerId: id,
                      }),
                    )
                  }
                >
                  Remove
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {canManage && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              disabled={assignable.length === 0}
            >
              <option value="">
                {assignable.length === 0 ? 'No providers to assign' : 'Assign a provider…'}
              </option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="secondary"
            loading={pending}
            disabled={!providerId}
            onClick={() =>
              run(() =>
                assignSupportingProviderAction({
                  appointmentId,
                  providerId,
                }),
              )
            }
          >
            Assign
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}