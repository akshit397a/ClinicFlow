'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPatientAction, updatePatientAction } from '@/lib/patients/actions';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/fields';

interface Props {
  mode: 'create' | 'edit';
  patientId?: string;
  initial?: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
  };
}

export function PatientForm({ mode, patientId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth ?? '');

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const input = {
        fullName,
        email: email.trim() === '' ? null : email,
        phone: phone.trim() === '' ? null : phone,
        dateOfBirth: dateOfBirth === '' ? null : new Date(`${dateOfBirth}T00:00:00`),
      };
      const result =
        mode === 'create'
          ? await createPatientAction(input)
          : await updatePatientAction({ patientId: patientId!, ...input });
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
        <Label htmlFor="full-name">Full name</Label>
        <Input
          id="full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="dob">Date of birth</Label>
        <Input
          id="dob"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Button onClick={handleSubmit} loading={pending} disabled={fullName.trim().length === 0}>
        {mode === 'create' ? 'Add patient' : 'Save changes'}
      </Button>
    </div>
  );
}