'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addNoteAction } from '@/lib/appointments/actions';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/fields';

interface Props {
  appointmentId: string;
}

export function AddNoteForm({ appointmentId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await addNoteAction({ appointmentId, content });
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong.');
      } else {
        setContent('');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Provider visit note…"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button onClick={handleSubmit} loading={pending} disabled={content.trim().length === 0}>
        Add note
      </Button>
    </div>
  );
}