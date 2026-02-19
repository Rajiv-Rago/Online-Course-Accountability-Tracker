import type { DailyStat } from '@/lib/types';

export interface WeeklyAggregate {
  totalMinutes: number;
  totalSessions: number;
  activeDays: number;
  avgSessionMinutes: number;
  coursesStudied: string[];
  modulesCompleted: number;
}

/**
 * Aggregates an array of DailyStat records into a weekly summary.
 */
export function aggregateWeek(dailyStats: DailyStat[]): WeeklyAggregate {
  if (dailyStats.length === 0) {
    return {
      totalMinutes: 0,
      totalSessions: 0,
      activeDays: 0,
      avgSessionMinutes: 0,
      coursesStudied: [],
      modulesCompleted: 0,
    };
  }

  let totalMinutes = 0;
  let totalSessions = 0;
  let activeDays = 0;
  let modulesCompleted = 0;
  const coursesSet = new Set<string>();

  for (const stat of dailyStats) {
    totalMinutes += stat.total_minutes;
    totalSessions += stat.session_count;
    modulesCompleted += stat.modules_completed;

    if (stat.total_minutes > 0) {
      activeDays++;
    }

    if (Array.isArray(stat.courses_studied)) {
      for (const courseId of stat.courses_studied) {
        // courses_studied is JSONB, items may be quoted strings
        const id = typeof courseId === 'string' ? courseId.replace(/"/g, '') : String(courseId);
        if (id) coursesSet.add(id);
      }
    }
  }

  return {
    totalMinutes,
    totalSessions,
    activeDays,
    avgSessionMinutes:
      totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0,
    coursesStudied: Array.from(coursesSet),
    modulesCompleted,
  };
}

/**
 * Compares two weekly aggregates and returns delta percentages.
 * Positive = improvement, negative = decline.
 */
export function compareWeeks(
  current: WeeklyAggregate,
  previous: WeeklyAggregate
): {
  minutesDelta: number;
  sessionsDelta: number;
  activeDaysDelta: number;
} {
  return {
    minutesDelta: calcDelta(current.totalMinutes, previous.totalMinutes),
    sessionsDelta: calcDelta(current.totalSessions, previous.totalSessions),
    activeDaysDelta: calcDelta(current.activeDays, previous.activeDays),
  };
}

function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
