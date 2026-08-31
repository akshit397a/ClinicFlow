'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  cancelAppointmentAction,
  transitionStatusAction,
} from '@/lib/appointments/actions';
import { nextStatuses } from '@/lib/appointments/status';
import type { AppointmentStatus, UserRole } from '@/lib/db/types';
import { Button } from '@/components/ui/Button';
import { Label, Textarea } from '@/components/ui/fields';

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
}

export function AppointmentActions({ appointment, currentUser }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const canAct =
    currentUser.role === 'front_desk' ||
    (currentUser.role === 'provider' && appointment.provider_id === currentUser.id);

  if (!canAct) return null;

  const transitions = nextStatuses(appointment.status).filter(
    (s) => s !== 'cancelled',
  );

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
              setShowCancel((v) => !v);
            }}
          >
            Cancel appointment
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {showCancel && (
        <div className="rounded-md border border-slate-200 p-3">
          <Label htmlFor="cancel-reason">Cancellation reason</Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this appointment being cancelled?"
          />
          {cancelError && (
            <p className="mt-1 text-sm text-red-700">{cancelError}</p>
          )}
          <div className="mt-2 flex gap-2">
            <Button variant="danger" onClick={handleCancel} loading={pending}>
              Confirm cancellation
            </Button>
            <Button variant="ghost" onClick={() => setShowCancel(false)}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}