'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult, LeaderboardEntry } from '@/lib/types';
import { getCurrentWeekRange, rankEntries } from '../lib/leaderboard-calculator';
import { calculateConsecutiveStreak } from '../lib/achievement-checker';

// =============================================================================
// getWeeklyLeaderboard
// =============================================================================

export async function getWeeklyLeaderboard(): Promise<ActionResult<LeaderboardEntry[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    // Get all accepted buddy IDs
    const { data: buddyRows } = await supabase
      .from('study_buddies')
      .select('requester_id, recipient_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

    const participantIds = new Set<string>([user.id]);
    for (const row of buddyRows ?? []) {
      participantIds.add(row.requester_id === user.id ? row.recipient_id : row.requester_id);
    }

    const ids = Array.from(participantIds);
    const { start, end } = getCurrentWeekRange();

    const admin = createAdminClient();

    // Batch fetch profiles, sessions this week, and daily stats for streaks
    const [profilesResult, sessionsResult, dailyStatsResult] = await Promise.all([
      admin
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', ids),
      admin
        .from('study_sessions')
        .select('user_id, duration_minutes')
        .in('user_id', ids)
        .gte('started_at', `${start}T00:00:00`)
        .lte('started_at', `${end}T23:59:59`),
      admin
        .from('daily_stats')
        .select('user_id, date, streak_day')
        .in('user_id', ids)
        .order('date', { ascending: false })
        .limit(ids.length * 100),
    ]);

    const profileMap = new Map(
      (profilesResult.data ?? []).map((p: { id: string; display_name: string; avatar_url: string | null }) => [p.id, p])
    );

    // Aggregate sessions per user
    const sessionAgg = new Map<string, { minutes: number; count: number }>();
    for (const s of sessionsResult.data ?? []) {
      const existing = sessionAgg.get(s.user_id) ?? { minutes: 0, count: 0 };
      existing.minutes += s.duration_minutes;
      existing.count += 1;
      sessionAgg.set(s.user_id, existing);
    }

    // Group daily stats per user for streak calculation
    const statsPerUser = new Map<string, { date: string; streak_day: boolean }[]>();
    for (const stat of dailyStatsResult.data ?? []) {
      const list = statsPerUser.get(stat.user_id) ?? [];
      list.push(stat);
      statsPerUser.set(stat.user_id, list);
    }

    // Build entries
    const entries: Omit<LeaderboardEntry, 'rank'>[] = ids.map((id) => {
      const profile = profileMap.get(id);
      const agg = sessionAgg.get(id) ?? { minutes: 0, count: 0 };
      const userStats = statsPerUser.get(id) ?? [];
      const streak = calculateConsecutiveStreak(userStats);

      return {
        user_id: id,
        name: profile?.display_name || 'Unknown',
        avatar_url: profile?.avatar_url ?? null,
        hours_this_week: Math.round((agg.minutes / 60) * 10) / 10,
        sessions_this_week: agg.count,
        streak,
      };
    });

    return { data: rankEntries(entries) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
