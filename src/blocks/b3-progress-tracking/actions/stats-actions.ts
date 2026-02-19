'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { DailyStat } from '@/lib/types';
import { STREAK_THRESHOLD_MINUTES } from '../lib/streak-calculator';

interface ActionResult<T = void> {
  data?: T;
  error?: string;
}

async function getAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

// ---------------------------------------------------------------------------
// UPSERT DAILY STATS
// Recalculates aggregate stats from study_sessions for a given date.
// ---------------------------------------------------------------------------
export async function upsertDailyStats(
  userId: string,
  date: string
): Promise<ActionResult<DailyStat>> {
  try {
    const supabase = await createClient();

    // Aggregate all sessions for this user+date
    const dayStart = date + 'T00:00:00Z';
    const dayEnd = date + 'T23:59:59.999Z';

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('duration_minutes, modules_completed, course_id')
      .eq('user_id', userId)
      .gte('started_at', dayStart)
      .lte('started_at', dayEnd)
      .not('ended_at', 'is', null); // exclude active timer sessions

    const totalMinutes = sessions?.reduce(
      (sum, s) => sum + (s.duration_minutes || 0),
      0
    ) ?? 0;
    const sessionCount = sessions?.length ?? 0;
    const modulesCompleted = sessions?.reduce(
      (sum, s) => sum + (s.modules_completed || 0),
      0
    ) ?? 0;
    const coursesStudied = Array.from(
      new Set(sessions?.map((s) => s.course_id).filter(Boolean) ?? [])
    );

    const streakDay = totalMinutes >= STREAK_THRESHOLD_MINUTES;

    const { data, error } = await supabase
      .from('daily_stats')
      .upsert(
        {
          user_id: userId,
          date,
          total_minutes: totalMinutes,
          session_count: sessionCount,
          modules_completed: modulesCompleted,
          courses_studied: coursesStudied,
          streak_day: streakDay,
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (error) return { error: error.message };
    return { data: data as DailyStat };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// FETCH DAILY STATS
// ---------------------------------------------------------------------------
export async function fetchDailyStats(
  startDate: string,
  endDate: string
): Promise<ActionResult<DailyStat[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('daily_stats')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) return { error: error.message };
    return { data: (data ?? []) as DailyStat[] };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// FETCH STREAK DATA (last 365 days of streak_day=true + freeze count)
// ---------------------------------------------------------------------------
export async function fetchStreakData(): Promise<
  ActionResult<{
    dailyStats: DailyStat[];
    freezeCount: number;
    dailyGoalMinutes: number;
  }>
> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const today = new Date();
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const [statsResult, profileResult] = await Promise.all([
      supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .gte('date', yearAgo.toISOString().split('T')[0])
        .order('date', { ascending: false }),
      supabase
        .from('user_profiles')
        .select('streak_freeze_count, daily_study_goal_minutes')
        .eq('id', userId)
        .single(),
    ]);

    if (statsResult.error) return { error: statsResult.error.message };

    return {
      data: {
        dailyStats: (statsResult.data ?? []) as DailyStat[],
        freezeCount: profileResult.data?.streak_freeze_count ?? 0,
        dailyGoalMinutes: profileResult.data?.daily_study_goal_minutes ?? 60,
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// APPLY STREAK FREEZE
// ---------------------------------------------------------------------------
export async function applyStreakFreeze(
  date: string
): Promise<ActionResult<{ remainingFreezes: number }>> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    // Check freeze count
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('streak_freeze_count')
      .eq('id', userId)
      .single();

    if (profileError || !profile)
      return { error: 'Could not load profile' };
    if (profile.streak_freeze_count <= 0)
      return { error: 'No streak freezes remaining' };

    // Upsert daily_stats for the freeze date (streak_day = true, total_minutes = 0)
    const { error: upsertError } = await supabase
      .from('daily_stats')
      .upsert(
        {
          user_id: userId,
          date,
          total_minutes: 0,
          session_count: 0,
          modules_completed: 0,
          courses_studied: [],
          streak_day: true,
        },
        { onConflict: 'user_id,date' }
      );

    if (upsertError) return { error: upsertError.message };

    // Decrement freeze count
    const newCount = profile.streak_freeze_count - 1;
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ streak_freeze_count: newCount })
      .eq('id', userId);

    if (updateError) return { error: updateError.message };

    revalidatePath('/progress');
    return { data: { remainingFreezes: newCount } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// FETCH TODAY STATS + PROFILE GOAL
// ---------------------------------------------------------------------------
export async function fetchTodayStats(): Promise<
  ActionResult<{
    today: DailyStat | null;
    dailyGoalMinutes: number;
  }>
> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();
    const todayStr = new Date().toISOString().split('T')[0];

    const [statsResult, profileResult] = await Promise.all([
      supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('daily_study_goal_minutes')
        .eq('id', userId)
        .single(),
    ]);

    return {
      data: {
        today: (statsResult.data as DailyStat) ?? null,
        dailyGoalMinutes: profileResult.data?.daily_study_goal_minutes ?? 60,
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
