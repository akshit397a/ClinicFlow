'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bookSlotAction } from '@/lib/appointments/actions';
import type { Patient } from '@/lib/db/types';
import { Button } from '@/components/ui/Button';
import { Label, Select } from '@/components/ui/fields';

interface Props {
  appointmentId: string;
  patients: Patient[];
}

export function BookSlotForm({ appointmentId, patients }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState('');

  function handleBook() {
    setError(null);
    startTransition(async () => {
      const result = await bookSlotAction({ appointmentId, patientId });
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong.');
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="patient">Patient</Label>
        <Select id="patient" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Select a patient…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button onClick={handleBook} loading={pending} disabled={!patientId}>
        Book this slot
      </Button>
    </div>
  );
}