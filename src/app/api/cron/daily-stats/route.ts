import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STREAK_THRESHOLD_MINUTES } from '@/blocks/b3-progress-tracking/lib/streak-calculator';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];
    const dayStart = today + 'T00:00:00Z';
    const dayEnd = today + 'T23:59:59.999Z';

    // Get all users who had sessions today
    const { data: usersWithSessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('user_id')
      .gte('started_at', dayStart)
      .lte('started_at', dayEnd)
      .not('ended_at', 'is', null);

    if (sessionsError) {
      return NextResponse.json(
        { error: sessionsError.message },
        { status: 500 }
      );
    }

    // Deduplicate user IDs
    const userIds = Array.from(new Set((usersWithSessions ?? []).map((s) => s.user_id)));

    let processed = 0;
    let errors = 0;

    for (const userId of userIds) {
      try {
        // Aggregate all completed sessions for this user today
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('duration_minutes, modules_completed, course_id')
          .eq('user_id', userId)
          .gte('started_at', dayStart)
          .lte('started_at', dayEnd)
          .not('ended_at', 'is', null);

        const totalMinutes =
          sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) ?? 0;
        const sessionCount = sessions?.length ?? 0;
        const modulesCompleted =
          sessions?.reduce(
            (sum, s) => sum + (s.modules_completed || 0),
            0
          ) ?? 0;
        const coursesStudied = Array.from(
          new Set(
            sessions?.map((s) => s.course_id).filter(Boolean) ?? []
          )
        );
        const streakDay = totalMinutes >= STREAK_THRESHOLD_MINUTES;

        const { error: upsertError } = await supabase
          .from('daily_stats')
          .upsert(
            {
              user_id: userId,
              date: today,
              total_minutes: totalMinutes,
              session_count: sessionCount,
              modules_completed: modulesCompleted,
              courses_studied: coursesStudied,
              streak_day: streakDay,
            },
            { onConflict: 'user_id,date' }
          );

        if (upsertError) {
          errors++;
        } else {
          processed++;
        }
      } catch {
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Daily stats aggregation complete',
      date: today,
      usersProcessed: processed,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
