'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  UserProfile,
  Course,
  StudySession,
  DailyStat,
  AiAnalysis,
  WeeklyReport,
  Notification,
  Achievement,
  StudyBuddy,
} from '@/lib/types';

interface ActionResult<T = void> {
  data?: T;
  error?: string;
}

export interface DashboardRawData {
  profile: Pick<UserProfile, 'display_name' | 'avatar_url' | 'timezone' | 'daily_study_goal_mins' | 'preferred_days'>;
  courses: Course[];
  sessions: StudySession[];
  dailyStats: DailyStat[];
  analyses: AiAnalysis[];
  weeklyReport: WeeklyReport | null;
  notifications: Notification[];
  achievements: Achievement[];
  buddies: StudyBuddy[];
}

export async function getDashboardData(): Promise<ActionResult<DashboardRawData>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [
      profileResult,
      coursesResult,
      sessionsResult,
      dailyStatsResult,
      analysesResult,
      weeklyReportResult,
      notificationsResult,
      achievementsResult,
      buddiesResult,
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('display_name, avatar_url, timezone, daily_study_goal_mins, preferred_days')
        .eq('id', user.id)
        .single(),
      supabase
        .from('courses')
        .select('*')
        .neq('status', 'abandoned')
        .order('sort_order', { ascending: true }),
      supabase
        .from('study_sessions')
        .select('*')
        .gte('started_at', thirtyDaysAgo)
        .order('started_at', { ascending: false })
        .limit(50),
      supabase
        .from('daily_stats')
        .select('*')
        .gte('date', sixtyDaysAgo.split('T')[0])
        .order('date', { ascending: false }),
      supabase
        .from('ai_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('weekly_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('achievements')
        .select('*')
        .order('earned_at', { ascending: false })
        .limit(10),
      supabase
        .from('study_buddies')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
    ]);

    if (profileResult.error) return { error: profileResult.error.message };

    return {
      data: {
        profile: profileResult.data,
        courses: (coursesResult.data ?? []) as Course[],
        sessions: (sessionsResult.data ?? []) as StudySession[],
        dailyStats: (dailyStatsResult.data ?? []) as DailyStat[],
        analyses: (analysesResult.data ?? []) as AiAnalysis[],
        weeklyReport: (weeklyReportResult.data as WeeklyReport | null) ?? null,
        notifications: (notificationsResult.data ?? []) as Notification[],
        achievements: (achievementsResult.data ?? []) as Achievement[],
        buddies: (buddiesResult.data ?? []) as StudyBuddy[],
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface BuddyActivityData {
  buddyId: string;
  buddyName: string;
  buddyAvatar: string | null;
  recentSession: { courseTitle: string; startedAt: string } | null;
}

export async function getBuddyActivity(
  buddyIds: string[]
): Promise<ActionResult<BuddyActivityData[]>> {
  if (buddyIds.length === 0) return { data: [] };

  try {
    const admin = createAdminClient();
    const results: BuddyActivityData[] = [];

    for (const buddyId of buddyIds) {
      const [profileResult, sessionResult] = await Promise.all([
        admin
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('id', buddyId)
          .single(),
        admin
          .from('study_sessions')
          .select('started_at, course_id')
          .eq('user_id', buddyId)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.error) continue;

      let recentSession: BuddyActivityData['recentSession'] = null;
      if (sessionResult.data) {
        const courseResult = await admin
          .from('courses')
          .select('title')
          .eq('id', sessionResult.data.course_id)
          .single();

        recentSession = {
          courseTitle: courseResult.data?.title ?? 'Unknown Course',
          startedAt: sessionResult.data.started_at,
        };
      }

      results.push({
        buddyId,
        buddyName: profileResult.data.display_name || 'Study Buddy',
        buddyAvatar: profileResult.data.avatar_url,
        recentSession,
      });
    }

    return { data: results };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
