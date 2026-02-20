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
  ActionResult,
} from '@/lib/types';

export interface DashboardRawData {
  userId: string;
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
    if (coursesResult.error) return { error: coursesResult.error.message };
    if (dailyStatsResult.error) return { error: dailyStatsResult.error.message };

    return {
      data: {
        userId: user.id,
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
    // Auth check: verify caller is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    // Authorization: verify each buddyId is an accepted buddy of the caller
    const { data: validBuddies } = await supabase
      .from('study_buddies')
      .select('requester_id, recipient_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

    const authorizedBuddyIds = new Set<string>();
    for (const b of validBuddies ?? []) {
      const otherId = b.requester_id === user.id ? b.recipient_id : b.requester_id;
      if (buddyIds.includes(otherId)) {
        authorizedBuddyIds.add(otherId);
      }
    }

    const verifiedIds = Array.from(authorizedBuddyIds);
    if (verifiedIds.length === 0) return { data: [] };

    // Batch queries using admin client (bypasses RLS for cross-user reads)
    const admin = createAdminClient();

    // Batch 1: fetch all profiles and all recent sessions in parallel
    const [profilesResult, sessionsResult] = await Promise.all([
      admin
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', verifiedIds),
      admin
        .from('study_sessions')
        .select('user_id, started_at, course_id')
        .in('user_id', verifiedIds)
        .order('started_at', { ascending: false }),
    ]);

    const profileMap = new Map(
      (profilesResult.data ?? []).map((p: { id: string; display_name: string; avatar_url: string | null }) => [p.id, p])
    );

    // Get the most recent session per buddy
    const latestSessionMap = new Map<string, { started_at: string; course_id: string }>();
    for (const session of sessionsResult.data ?? []) {
      if (!latestSessionMap.has(session.user_id)) {
        latestSessionMap.set(session.user_id, session);
      }
    }

    // Batch 2: fetch all course titles in one query
    const courseIds = new Set<string>();
    latestSessionMap.forEach((session) => {
      courseIds.add(session.course_id);
    });

    const courseMap = new Map<string, string>();
    if (courseIds.size > 0) {
      const coursesResult = await admin
        .from('courses')
        .select('id, title')
        .in('id', Array.from(courseIds));
      for (const c of coursesResult.data ?? []) {
        courseMap.set(c.id, c.title);
      }
    }

    // Assemble results
    const results: BuddyActivityData[] = [];
    for (const buddyId of verifiedIds) {
      const profile = profileMap.get(buddyId);
      if (!profile) continue;

      const latestSession = latestSessionMap.get(buddyId);
      let recentSession: BuddyActivityData['recentSession'] = null;
      if (latestSession) {
        recentSession = {
          courseTitle: courseMap.get(latestSession.course_id) ?? 'Unknown Course',
          startedAt: latestSession.started_at,
        };
      }

      results.push({
        buddyId,
        buddyName: profile.display_name || 'Study Buddy',
        buddyAvatar: profile.avatar_url,
        recentSession,
      });
    }

    return { data: results };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
