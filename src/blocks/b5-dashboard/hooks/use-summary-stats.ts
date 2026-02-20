'use client';

import { useMemo } from 'react';
import type { Course, DailyStat } from '@/lib/types';
import {
  calculateStreak,
  calculateWeeklyHours,
  calculatePreviousWeekHours,
  calculateOverallProgress,
  calculateTrend,
  type SummaryStatsData,
} from '../lib/dashboard-utils';

export function useSummaryStats(
  dailyStats: DailyStat[],
  courses: Course[],
  timezone?: string
): SummaryStatsData {
  return useMemo(() => {
    const streak = calculateStreak(dailyStats, timezone);
    const hoursThisWeek = calculateWeeklyHours(dailyStats);
    const hoursPrevWeek = calculatePreviousWeekHours(dailyStats);
    const activeCourseCount = courses.filter(
      (c) => c.status === 'in_progress'
    ).length;
    const overallProgress = calculateOverallProgress(courses);
    const hoursThisWeekTrend = calculateTrend(hoursThisWeek, hoursPrevWeek);

    return {
      streak,
      hoursThisWeek,
      hoursThisWeekTrend,
      activeCourseCount,
      overallProgress,
    };
  }, [dailyStats, courses, timezone]);
}
