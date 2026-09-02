'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  cancelAppointmentAction,
  reassignProviderAction,
  transitionStatusAction,
} from '@/lib/appointments/actions';
import { nextStatuses } from '@/lib/appointments/status';
import type { AppointmentStatus, UserRole } from '@/lib/db/types';
import { Button } from '@/components/ui/Button';
import { Label, Select, Textarea } from '@/components/ui/fields';

const TRANSITION_LABELS: Partial<Record<AppointmentStatus, string>> = {
  confirmed: 'Confirm',
  checked_in: 'Check in',
  completed: 'Complete',
  no_show: 'Mark no show',
};

interface Props {
  appointment: {
    id: string;
    status: AppointmentStatus | null;
    provider_id: string;
  };
  currentUser: { id: string; role: UserRole };
  providers?: { id: string; full_name: string }[];
}

export function AppointmentActions({ appointment, currentUser, providers = [] }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Cancel form state
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Reassign form state
  const [showReassign, setShowReassign] = useState(false);
  const eligibleProviders = providers.filter((p) => p.id !== appointment.provider_id);
  const [selectedNewProvider, setSelectedNewProvider] = useState(
    eligibleProviders[0]?.id ?? '',
  );
  const [reassignError, setReassignError] = useState<string | null>(null);

  const canAct =
    currentUser.role === 'front_desk' ||
    (currentUser.role === 'provider' && appointment.provider_id === currentUser.id);

  if (!canAct) return null;

  const transitions = nextStatuses(appointment.status).filter(
    (s) => s !== 'cancelled',
  );

  const canReassign =
    currentUser.role === 'front_desk' &&
    appointment.status !== null &&
    appointment.status !== 'completed' &&
    appointment.status !== 'cancelled' &&
    appointment.status !== 'no_show' &&
    eligibleProviders.length > 0;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong.');
      } else {
        router.refresh();
      }
    });
  }

  function handleCancel() {
    setCancelError(null);
    startTransition(async () => {
      const result = await cancelAppointmentAction({
        appointmentId: appointment.id,
        reason,
      });
      if (!result.ok) {
        setCancelError(result.error ?? 'Something went wrong.');
      } else {
        router.refresh();
        setShowCancel(false);
        setReason('');
      }
    });
  }

  function handleReassign() {
    const targetProviderId = selectedNewProvider || eligibleProviders[0]?.id;
    if (!targetProviderId) {
      setReassignError('No eligible provider available for transfer.');
      return;
    }
    setReassignError(null);
    startTransition(async () => {
      const result = await reassignProviderAction({
        appointmentId: appointment.id,
        newProviderId: targetProviderId,
      });
      if (!result.ok) {
        setReassignError(result.error ?? 'Something went wrong.');
      } else {
        router.refresh();
        setShowReassign(false);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {transitions.map((status) => (
          <Button
            key={status}
            variant={status === 'no_show' ? 'danger' : 'primary'}
            loading={pending}
            onClick={() =>
              run(() =>
                transitionStatusAction({
                  appointmentId: appointment.id,
                  toStatus: status,
                }),
              )
            }
          >
            {TRANSITION_LABELS[status] ?? status}
          </Button>
        ))}

        {appointment.status !== null && nextStatuses(appointment.status).includes('cancelled') && (
          <Button
            variant="secondary"
            loading={pending}
            onClick={() => {
              setError(null);
              setShowReassign(false);
              setShowCancel((v) => !v);
            }}
          >
            Cancel appointment
          </Button>
        )}

        {canReassign && (
          <Button
            variant="secondary"
            loading={pending}
            onClick={() => {
              setError(null);
              setShowCancel(false);
              setShowReassign((v) => !v);
            }}
          >
            Reassign provider
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Cancellation Form */}
      {showCancel && (
        <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4 space-y-3">
          <Label htmlFor="cancel-reason">Cancellation reason</Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this appointment being cancelled?"
          />
          {cancelError && (
            <p className="text-xs text-red-600 font-medium">{cancelError}</p>
          )}
          <div className="flex gap-2">
            <Button variant="danger" onClick={handleCancel} loading={pending}>
              Confirm cancellation
            </Button>
            <Button variant="ghost" onClick={() => setShowCancel(false)}>
              Back
            </Button>
          </div>
        </div>
      )}

      {/* Reassign Provider Form */}
      {showReassign && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <div>
            <Label htmlFor="new-provider" className="text-blue-900 font-semibold">
              Reassign to another provider
            </Label>
            <p className="text-xs text-blue-700 mb-2">
              Front-desk action: Transfer this scheduled appointment to a different doctor.
            </p>
            <Select
              id="new-provider"
              value={selectedNewProvider}
              onChange={(e) => setSelectedNewProvider(e.target.value)}
            >
              {eligibleProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  Dr. {p.full_name}
                </option>
              ))}
            </Select>
          </div>
          {reassignError && (
            <p className="text-xs text-red-600 font-medium">{reassignError}</p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleReassign} loading={pending}>
              Transfer appointment
            </Button>
            <Button variant="ghost" onClick={() => setShowReassign(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}