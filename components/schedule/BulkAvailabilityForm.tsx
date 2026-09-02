'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateAvailabilityAction } from '@/lib/availability/actions';
import type { Profile } from '@/lib/db/types';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/fields';

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

interface Props {
  providers: Profile[];
  defaultProviderId: string;
}

export function BulkAvailabilityForm({ providers, defaultProviderId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [providerId, setProviderId] = useState(defaultProviderId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [gapMinutes, setGapMinutes] = useState(0);

  function toggleWeekday(value: number) {
    setWeekdays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort(),
    );
  }

  function handleSubmit() {
    setMessage(null);
    startTransition(async () => {
      const result = await generateAvailabilityAction({
        providerId,
        startDate: new Date(`${startDate}T00:00:00`),
        endDate: new Date(`${endDate}T00:00:00`),
        weekdays,
        startTime,
        endTime,
        durationMinutes,
        gapMinutes,
      });
      if (result.ok) {
        const skippedMsg =
          result.skipped > 0
            ? `, skipped ${result.skipped} slot(s) colliding with existing bookings`
            : '';
        setMessage({
          ok: true,
          text: `Successfully created ${result.created} slot(s)${skippedMsg}.`,
        });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <Label htmlFor="provider">Provider</Label>
          <Select
            id="provider"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="start-date">Start date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="end-date">End date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Duration (min)</Label>
          <Select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}>
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={45}>45</option>
            <option value={60}>60</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="start-time">Start time</Label>
          <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="end-time">End time</Label>
          <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="gap">Gap (min)</Label>
          <Input
            id="gap"
            type="number"
            min={0}
            max={120}
            value={gapMinutes}
            onChange={(e) => setGapMinutes(Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <Label>Weekdays</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleWeekday(day.value)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                weekdays.includes(day.value)
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-300 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            message.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}

      <Button onClick={handleSubmit} loading={pending}>
        Generate availability
      </Button>
    </div>
  );
}