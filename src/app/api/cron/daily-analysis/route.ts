import { NextResponse } from 'next/server';
import { runDailyAnalysis } from '@/blocks/b4-ai-analysis/lib/ai-pipeline';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyAnalysis();
    return NextResponse.json({
      message: 'Daily analysis complete',
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
