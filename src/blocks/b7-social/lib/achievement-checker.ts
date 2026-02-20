import type { AchievementType, Course, DailyStat, StudySession } from '@/lib/types';

// =============================================================================
// Achievement evaluation functions
// Each returns true if the achievement criteria are met
// =============================================================================

export function checkFirstSession(sessionCount: number): boolean {
  return sessionCount >= 1;
}

export function checkStreak(consecutiveDays: number, required: number): boolean {
  return consecutiveDays >= required;
}

export function checkNightOwl(nightSessionCount: number): boolean {
  return nightSessionCount >= 5;
}

export function checkEarlyBird(earlySessionCount: number): boolean {
  return earlySessionCount >= 5;
}

export function checkMarathon(sessions: Pick<StudySession, 'duration_minutes'>[]): boolean {
  return sessions.some((s) => s.duration_minutes >= 180);
}

export function checkConsistencyKing(recentStats: Pick<DailyStat, 'total_minutes'>[]): boolean {
  if (recentStats.length < 14) return false;
  const last14 = recentStats.slice(0, 14);
  const mean = last14.reduce((sum, d) => sum + d.total_minutes, 0) / 14;
  if (mean === 0) return false;
  const variance = last14.reduce((sum, d) => sum + Math.pow(d.total_minutes - mean, 2), 0) / 14;
  const stddev = Math.sqrt(variance);
  return stddev / mean < 0.10;
}

export function checkSpeedLearner(course: Pick<Course, 'status' | 'target_completion_date' | 'updated_at'>): boolean {
  if (course.status !== 'completed' || !course.target_completion_date) return false;
  const completedDate = new Date(course.updated_at).toISOString().split('T')[0];
  return completedDate < course.target_completion_date;
}

export function checkComebackKid(course: Pick<Course, 'status'>, wasPaused: boolean): boolean {
  return course.status === 'completed' && wasPaused;
}

export function checkPerfectionist(course: Pick<Course, 'completed_modules' | 'total_modules'>): boolean {
  return course.total_modules !== null && course.total_modules > 0 && course.completed_modules === course.total_modules;
}

export function checkExplorer(distinctPlatformCount: number): boolean {
  return distinctPlatformCount >= 3;
}

export function checkDedication(totalMinutesAllTime: number): boolean {
  return totalMinutesAllTime >= 6000;
}

export function checkSocialButterfly(acceptedBuddyCount: number): boolean {
  return acceptedBuddyCount >= 5;
}

// =============================================================================
// Progress calculators — return { current, target } for trackable achievements
// =============================================================================

export interface ProgressInfo {
  current: number;
  target: number;
}

export function calculateProgress(
  type: AchievementType,
  data: {
    sessionCount?: number;
    consecutiveStreak?: number;
    nightSessionCount?: number;
    earlySessionCount?: number;
    consistentDays?: number;
    distinctPlatforms?: number;
    totalMinutes?: number;
    acceptedBuddies?: number;
  }
): ProgressInfo {
  switch (type) {
    case 'first_session':
      return { current: Math.min(data.sessionCount ?? 0, 1), target: 1 };
    case 'streak_7':
      return { current: Math.min(data.consecutiveStreak ?? 0, 7), target: 7 };
    case 'streak_30':
      return { current: Math.min(data.consecutiveStreak ?? 0, 30), target: 30 };
    case 'streak_100':
      return { current: Math.min(data.consecutiveStreak ?? 0, 100), target: 100 };
    case 'night_owl':
      return { current: Math.min(data.nightSessionCount ?? 0, 5), target: 5 };
    case 'early_bird':
      return { current: Math.min(data.earlySessionCount ?? 0, 5), target: 5 };
    case 'consistency_king':
      return { current: Math.min(data.consistentDays ?? 0, 14), target: 14 };
    case 'explorer':
      return { current: Math.min(data.distinctPlatforms ?? 0, 3), target: 3 };
    case 'dedication':
      return { current: Math.min(data.totalMinutes ?? 0, 6000), target: 6000 };
    case 'social_butterfly':
      return { current: Math.min(data.acceptedBuddies ?? 0, 5), target: 5 };
    default:
      return { current: 0, target: 1 };
  }
}

/**
 * Calculate current streak from daily_stats rows (ordered date desc).
 * Counts consecutive rows where streak_day = true from the most recent date.
 */
export function calculateConsecutiveStreak(
  dailyStats: Pick<DailyStat, 'date' | 'streak_day'>[]
): number {
  let streak = 0;
  for (const stat of dailyStats) {
    if (stat.streak_day) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Count sessions started after 22:00 local time.
 */
export function countNightSessions(
  sessions: Pick<StudySession, 'started_at'>[],
  timezone: string
): number {
  let count = 0;
  for (const s of sessions) {
    const hour = getHourInTimezone(s.started_at, timezone);
    if (hour >= 22) count++;
  }
  return count;
}

/**
 * Count sessions started before 07:00 local time.
 */
export function countEarlySessions(
  sessions: Pick<StudySession, 'started_at'>[],
  timezone: string
): number {
  let count = 0;
  for (const s of sessions) {
    const hour = getHourInTimezone(s.started_at, timezone);
    if (hour < 7) count++;
  }
  return count;
}

function getHourInTimezone(isoDate: string, timezone: string): number {
  try {
    const date = new Date(isoDate);
    const formatted = date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: timezone });
    return parseInt(formatted, 10);
  } catch {
    return new Date(isoDate).getUTCHours();
  }
}
