import { format } from 'date-fns';

export function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), 'MMM d, yyyy h:mm a');
}

export function formatDate(value: string | Date): string {
  return format(toDate(value), 'MMM d, yyyy');
}

export function formatTime(value: string | Date): string {
  return format(toDate(value), 'h:mm a');
}

export function formatDateInput(value: string | Date): string {
  return format(toDate(value), 'yyyy-MM-dd');
}

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function startOfDayLocal(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function addDaysLocal(value: Date, days: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);
}

export function minutesUntil(date: Date, from: Date = new Date()): number {
  return Math.round((date.getTime() - from.getTime()) / 60000);
}