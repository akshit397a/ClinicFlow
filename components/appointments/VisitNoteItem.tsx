'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { editNoteAction } from '@/lib/appointments/actions';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/fields';
import { formatDate } from '@/lib/utils/dates';

interface Props {
  note: {
    id: string;
    author_provider_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    author: {
      id: string;
      full_name: string;
    };
  };
  currentUserId: string;
}

export function VisitNoteItem({ note, currentUserId }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canEdit = currentUserId === note.author_provider_id;
  const isEdited =
    new Date(note.updated_at).getTime() - new Date(note.created_at).getTime() > 1000;

  function handleSave() {
    if (!content.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await editNoteAction({
        noteId: note.id,
        content: content.trim(),
      });
      if (!res.ok) {
        setError(res.error ?? 'Failed to update visit note.');
      } else {
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-[#f3f4f6] bg-[#fafafa] p-4 transition-all">
      {!isEditing ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-[#111111] leading-relaxed whitespace-pre-wrap">
              {note.content}
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-[#6b7280] hover:text-[#111111] transition-colors shrink-0 px-2 py-0.5 rounded hover:bg-white"
              >
                Edit
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#9ca3af]">
            <span>{note.author.full_name}</span>
            <span>·</span>
            <span>{formatDate(note.created_at)}</span>
            {isEdited && (
              <>
                <span>·</span>
                <span className="italic text-[#9ca3af]">(edited)</span>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <Textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={pending}
            className="bg-white"
          />
          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} loading={pending}>
              Save note
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setContent(note.content);
                setError(null);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
