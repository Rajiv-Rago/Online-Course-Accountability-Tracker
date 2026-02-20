import { NextResponse } from 'next/server';
import { generateWeeklyReports } from '@/blocks/b4-ai-analysis/lib/ai-pipeline';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await generateWeeklyReports();
    return NextResponse.json({
      message: 'Weekly reports complete',
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
