export const STREAK_THRESHOLD_MINUTES = 15;

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  isStudiedToday: boolean;
}

/**
 * Pure function: given an array of daily_stats sorted by date DESC,
 * computes current streak and longest streak.
 *
 * Rules:
 * - A "study day" is one where streak_day = true (total_minutes >= threshold OR freeze)
 * - Current streak: consecutive study days ending at today or yesterday
 * - If today has no study yet, streak still counts if yesterday was a study day
 * - Freeze days (streak_day = true, total_minutes = 0) count as valid streak days
 */
export function calculateStreaks(
  dailyStats: Array<{
    date: string;
    streak_day: boolean;
    total_minutes: number;
  }>,
  today: Date
): StreakResult {
  if (dailyStats.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      isStudiedToday: false,
    };
  }

  // Build a Set of study day date strings for O(1) lookup
  const studyDays = new Set<string>();
  let lastStudyDate: string | null = null;

  for (const stat of dailyStats) {
    if (stat.streak_day) {
      studyDays.add(stat.date);
      if (!lastStudyDate || stat.date > lastStudyDate) {
        lastStudyDate = stat.date;
      }
    }
  }

  const todayStr = formatDateUTC(today);
  const isStudiedToday = studyDays.has(todayStr);

  // Calculate current streak
  let currentStreak = 0;
  const pointer = new Date(today);
  pointer.setUTCHours(0, 0, 0, 0);

  // If today is a study day, include it
  if (isStudiedToday) {
    currentStreak = 1;
    pointer.setUTCDate(pointer.getUTCDate() - 1);
  } else {
    // Grace period: check yesterday
    pointer.setUTCDate(pointer.getUTCDate() - 1);
    if (!studyDays.has(formatDateUTC(pointer))) {
      // Neither today nor yesterday is a study day - streak is 0
      return {
        currentStreak: 0,
        longestStreak: calculateLongestStreak(dailyStats),
        lastStudyDate,
        isStudiedToday: false,
      };
    }
  }

  // Walk backwards from pointer
  while (studyDays.has(formatDateUTC(pointer))) {
    currentStreak++;
    pointer.setUTCDate(pointer.getUTCDate() - 1);
  }

  const longestStreak = calculateLongestStreak(dailyStats);

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastStudyDate,
    isStudiedToday,
  };
}

function calculateLongestStreak(
  dailyStats: Array<{ date: string; streak_day: boolean }>
): number {
  // Sort by date ascending
  const sorted = [...dailyStats]
    .filter((s) => s.streak_day)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date + 'T00:00:00Z');
    const currDate = new Date(sorted[i].date + 'T00:00:00Z');
    const diffDays =
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
