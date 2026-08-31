import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getDaySchedule } from '@/lib/appointments/queries';
import { buildScheduleCsv } from '@/lib/csv/schedule';

export async function GET(request: NextRequest): Promise<NextResponse> {
  await requireAuth();

  const providerId = request.nextUrl.searchParams.get('provider_id');
  const dateParam = request.nextUrl.searchParams.get('date');

  if (!providerId || !dateParam) {
    return NextResponse.json(
      { error: 'provider_id and date (yyyy-MM-dd) are required.' },
      { status: 400 },
    );
  }

  const date = new Date(`${dateParam}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      { error: 'date must be in yyyy-MM-dd format.' },
      { status: 400 },
    );
  }

  const rows = await getDaySchedule(providerId, date);
  const csv = buildScheduleCsv(rows);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="schedule-${providerId}-${dateParam}.csv"`,
    },
  });
}