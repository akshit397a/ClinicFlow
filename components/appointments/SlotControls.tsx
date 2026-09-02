'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveSlotAction,
  editSlotAction,
  restoreSlotAction,
} from '@/lib/appointments/actions';
import type { UserRole } from '@/lib/db/types';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/fields';

interface Props {
  appointment: {
    id: string;
    scheduled_start: string;
    duration_minutes: number;
    provider_id: string;
    archived_at: string | null;
  };
  currentUser: { id: string; role: UserRole };
}

export function SlotControls({ appointment, currentUser }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialDate = new Date(appointment.scheduled_start);
  const [dateStr, setDateStr] = useState(
    initialDate.toISOString().slice(0, 10),
  );
  const [timeStr, setTimeStr] = useState(
    initialDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  );
  const [duration, setDuration] = useState(appointment.duration_minutes);

  const canManage =
    currentUser.role === 'front_desk' ||
    (currentUser.role === 'provider' && appointment.provider_id === currentUser.id);

  if (!canManage) return null;

  const isArchived = appointment.archived_at !== null;

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const res = await archiveSlotAction({ appointmentId: appointment.id });
      if (!res.ok) {
        setError(res.error ?? 'Failed to archive slot.');
      } else {
        router.refresh();
      }
    });
  }

  function handleRestore() {
    setError(null);
    startTransition(async () => {
      const res = await restoreSlotAction({ appointmentId: appointment.id });
      if (!res.ok) {
        setError(res.error ?? 'Failed to restore slot.');
      } else {
        router.refresh();
      }
    });
  }

  function handleSaveEdit() {
    setError(null);
    startTransition(async () => {
      const newScheduledStart = new Date(`${dateStr}T${timeStr}:00`);
      if (Number.isNaN(newScheduledStart.getTime())) {
        setError('Invalid date or time.');
        return;
      }

      const res = await editSlotAction({
        appointmentId: appointment.id,
        scheduledStart: newScheduledStart,
        durationMinutes: duration,
      });

      if (!res.ok) {
        setError(res.error ?? 'Failed to edit slot.');
      } else {
        setShowEdit(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4 pt-2 border-t border-[#f3f4f6]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#9ca3af]">
            Slot Management
          </h4>
          <p className="text-xs text-[#6b7280]">
            {isArchived
              ? 'This slot is archived and hidden from the public clinic schedule'
              : 'Edit timing or remove from schedule while unbooked'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isArchived ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowEdit((v) => !v)}
                disabled={pending}
              >
                {showEdit ? 'Cancel editing' : 'Edit slot'}
              </Button>
              <Button
                variant="danger"
                onClick={handleArchive}
                loading={pending}
              >
                Archive slot
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleRestore}
              loading={pending}
            >
              Restore slot
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      {/* Edit Form */}
      {showEdit && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <h5 className="text-xs font-bold text-blue-900">
            Edit slot date, time, and duration
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="slot-date">Date</Label>
              <Input
                id="slot-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="slot-time">Start time</Label>
              <Input
                id="slot-time"
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="slot-duration">Duration</Label>
              <Select
                id="slot-duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSaveEdit} loading={pending}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
