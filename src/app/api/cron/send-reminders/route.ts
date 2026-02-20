import { NextResponse } from 'next/server';
import { processReminders } from '@/blocks/b6-notifications/lib/reminder-scheduler';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processReminders();
  return NextResponse.json(result);
}
