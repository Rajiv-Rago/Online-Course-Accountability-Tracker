'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Achievement, ActionResult, AchievementType, LockedAchievement } from '@/lib/types';
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_MAP } from '../lib/achievement-definitions';
import { getDefinitionsForTrigger } from '../lib/achievement-definitions';
import {
  checkFirstSession,
  checkStreak,
  checkNightOwl,
  checkEarlyBird,
  checkMarathon,
  checkConsistencyKing,
  checkSpeedLearner,
  checkComebackKid,
  checkPerfectionist,
  checkExplorer,
  checkDedication,
  checkSocialButterfly,
  calculateConsecutiveStreak,
  countNightSessions,
  countEarlySessions,
  calculateProgress,
} from '../lib/achievement-checker';
import { shareAchievementSchema, type AchievementTrigger } from '../lib/buddy-validation';

// =============================================================================
// Types
// =============================================================================

export interface AchievementsData {
  earned: Achievement[];
  locked: LockedAchievement[];
}

// =============================================================================
// getAchievements
// =============================================================================

export async function getAchievements(): Promise<ActionResult<AchievementsData>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const [achievementsResult, sessionsResult, dailyStatsResult, coursesResult, buddiesResult] = await Promise.all([
      supabase
        .from('achievements')
        .select('*')
        .order('earned_at', { ascending: false }),
      supabase
        .from('study_sessions')
        .select('id, started_at, duration_minutes')
        .order('started_at', { ascending: false }),
      supabase
        .from('daily_stats')
        .select('date, total_minutes, streak_day')
        .order('date', { ascending: false }),
      supabase
        .from('courses')
        .select('id, platform, status, completed_modules, total_modules')
        .order('created_at', { ascending: false }),
      supabase
        .from('study_buddies')
        .select('id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
    ]);

    const earned = (achievementsResult.data ?? []) as Achievement[];
    const earnedTypes = new Set(earned.map((a) => a.achievement_type));

    // Get the user's timezone for time-based achievements
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('id', user.id)
      .single();
    const timezone = profile?.timezone ?? 'UTC';

    // Calculate progress data
    const sessions = sessionsResult.data ?? [];
    const dailyStats = dailyStatsResult.data ?? [];
    const courses = coursesResult.data ?? [];

    const consecutiveStreak = calculateConsecutiveStreak(dailyStats);
    const nightSessionCount = countNightSessions(sessions, timezone);
    const earlySessionCount = countEarlySessions(sessions, timezone);
    const totalMinutes = dailyStats.reduce((sum, d) => sum + d.total_minutes, 0);
    const distinctPlatforms = new Set(courses.map((c) => c.platform).filter(Boolean)).size;
    const acceptedBuddies = (buddiesResult.data ?? []).length;

    // Build locked achievements with progress
    const locked: LockedAchievement[] = [];
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (earnedTypes.has(def.type) && !def.repeatable) continue;

      const progress = calculateProgress(def.type, {
        sessionCount: sessions.length,
        consecutiveStreak,
        nightSessionCount,
        earlySessionCount,
        consistentDays: consecutiveStreak,
        distinctPlatforms,
        totalMinutes,
        acceptedBuddies,
      });

      locked.push({
        achievement_type: def.type,
        name: def.name,
        description: def.description,
        category: def.category,
        progress: def.maxProgress > 0 ? Math.round((progress.current / progress.target) * 100) : 0,
        current: progress.current,
        target: progress.target,
      });
    }

    return { data: { earned, locked } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// =============================================================================
// checkAchievements
// =============================================================================

export async function checkAchievements(
  trigger: AchievementTrigger
): Promise<ActionResult<Achievement[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    // Get candidates for this trigger
    const candidates = getDefinitionsForTrigger(trigger);
    if (candidates.length === 0) return { data: [] };

    // Get already-earned achievements
    const { data: existing } = await supabase
      .from('achievements')
      .select('achievement_type, course_id');
    const earnedSet = new Set(
      (existing ?? []).map((a: { achievement_type: string; course_id: string | null }) =>
        `${a.achievement_type}:${a.course_id ?? 'null'}`
      )
    );

    // Get user profile for timezone
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('id', user.id)
      .single();
    const timezone = profile?.timezone ?? 'UTC';

    // Fetch all data needed for evaluation
    const [sessionsResult, dailyStatsResult, coursesResult, buddiesResult] = await Promise.all([
      supabase
        .from('study_sessions')
        .select('id, started_at, duration_minutes')
        .order('started_at', { ascending: false }),
      supabase
        .from('daily_stats')
        .select('date, total_minutes, streak_day, session_count')
        .order('date', { ascending: false }),
      supabase
        .from('courses')
        .select('id, platform, status, completed_modules, total_modules, target_completion_date, updated_at'),
      supabase
        .from('study_buddies')
        .select('id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
    ]);

    const sessions = sessionsResult.data ?? [];
    const dailyStats = dailyStatsResult.data ?? [];
    const courses = coursesResult.data ?? [];
    const acceptedBuddies = (buddiesResult.data ?? []).length;

    const consecutiveStreak = calculateConsecutiveStreak(dailyStats);
    const totalMinutes = dailyStats.reduce((sum, d) => sum + d.total_minutes, 0);
    const distinctPlatforms = new Set(courses.map((c) => c.platform).filter(Boolean)).size;

    const newlyEarned: Achievement[] = [];

    for (const def of candidates) {
      let earned = false;
      let courseId: string | null = null;

      const key = (type: AchievementType, cId: string | null) => `${type}:${cId ?? 'null'}`;

      switch (def.type) {
        case 'first_session':
          earned = !earnedSet.has(key('first_session', null)) && checkFirstSession(sessions.length);
          break;
        case 'streak_7':
          earned = !earnedSet.has(key('streak_7', null)) && checkStreak(consecutiveStreak, 7);
          break;
        case 'streak_30':
          earned = !earnedSet.has(key('streak_30', null)) && checkStreak(consecutiveStreak, 30);
          break;
        case 'streak_100':
          earned = !earnedSet.has(key('streak_100', null)) && checkStreak(consecutiveStreak, 100);
          break;
        case 'night_owl':
          earned = !earnedSet.has(key('night_owl', null)) && checkNightOwl(countNightSessions(sessions, timezone));
          break;
        case 'early_bird':
          earned = !earnedSet.has(key('early_bird', null)) && checkEarlyBird(countEarlySessions(sessions, timezone));
          break;
        case 'marathon':
          earned = !earnedSet.has(key('marathon', null)) && checkMarathon(sessions);
          break;
        case 'consistency_king':
          earned = !earnedSet.has(key('consistency_king', null)) && checkConsistencyKing(dailyStats);
          break;
        case 'explorer':
          earned = !earnedSet.has(key('explorer', null)) && checkExplorer(distinctPlatforms);
          break;
        case 'dedication':
          earned = !earnedSet.has(key('dedication', null)) && checkDedication(totalMinutes);
          break;
        case 'social_butterfly':
          earned = !earnedSet.has(key('social_butterfly', null)) && checkSocialButterfly(acceptedBuddies);
          break;
        case 'course_complete':
          for (const course of courses) {
            if (course.status === 'completed' && !earnedSet.has(key('course_complete', course.id))) {
              earned = true;
              courseId = course.id;
              break;
            }
          }
          break;
        case 'speed_learner':
          for (const course of courses) {
            if (!earnedSet.has(key('speed_learner', course.id)) && checkSpeedLearner(course)) {
              earned = true;
              courseId = course.id;
              break;
            }
          }
          break;
        case 'comeback_kid':
          // Check if any completed course was previously paused
          // We check the status history via the course metadata
          for (const course of courses) {
            if (course.status === 'completed' && !earnedSet.has(key('comeback_kid', course.id))) {
              // Check study_sessions for a gap pattern (simplified: if course exists and is completed, check notes/metadata)
              if (checkComebackKid(course, false)) {
                earned = true;
                courseId = course.id;
                break;
              }
            }
          }
          break;
        case 'perfectionist':
          for (const course of courses) {
            if (!earnedSet.has(key('perfectionist', course.id)) && checkPerfectionist(course)) {
              earned = true;
              courseId = course.id;
              break;
            }
          }
          break;
      }

      if (earned) {
        const { data: inserted, error: insertError } = await supabase
          .from('achievements')
          .insert({
            user_id: user.id,
            achievement_type: def.type,
            course_id: courseId,
            metadata: { trigger },
          })
          .select()
          .single();

        if (!insertError && inserted) {
          newlyEarned.push(inserted as Achievement);

          // Create notification
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'achievement',
            title: 'Achievement Unlocked!',
            message: `You earned "${def.name}" — ${def.description}`,
            action_url: '/social/achievements',
            channels_sent: ['in_app'],
          });
        }
      }
    }

    return { data: newlyEarned };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// =============================================================================
// shareAchievement
// =============================================================================

export async function shareAchievement(
  achievementId: string,
  shared: boolean
): Promise<ActionResult> {
  try {
    const parsed = shareAchievementSchema.safeParse({ achievementId, shared });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const { error: updateError } = await supabase
      .from('achievements')
      .update({ shared })
      .eq('id', achievementId);

    if (updateError) return { error: updateError.message };
    return { data: undefined };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
