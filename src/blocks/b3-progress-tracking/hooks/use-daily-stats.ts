'use client';

import { useQuery } from '@tanstack/react-query';
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
} from 'date-fns';
import type { DailyStat } from '@/lib/types';
import { fetchDailyStats, fetchTodayStats } from '../actions/stats-actions';
import { aggregateWeek, compareWeeks, type WeeklyAggregate } from '../lib/stats-aggregator';

export interface DailyStatsData {
  today: DailyStat | null;
  thisWeek: DailyStat[];
  lastWeek: DailyStat[];
  thisWeekAggregate: WeeklyAggregate;
  lastWeekAggregate: WeeklyAggregate;
  comparison: { minutesDelta: number; sessionsDelta: number; activeDaysDelta: number };
  dailyGoalMinutes: number;
  goalProgress: number;
}

export function useDailyStats() {
  return useQuery({
    queryKey: ['daily-stats'],
    queryFn: async (): Promise<DailyStatsData> => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = subWeeks(weekStart, 1);
      const lastWeekEnd = subWeeks(weekEnd, 1);

      const [todayResult, thisWeekResult, lastWeekResult] = await Promise.all([
        fetchTodayStats(),
        fetchDailyStats(
          format(weekStart, 'yyyy-MM-dd'),
          format(weekEnd, 'yyyy-MM-dd')
        ),
        fetchDailyStats(
          format(lastWeekStart, 'yyyy-MM-dd'),
          format(lastWeekEnd, 'yyyy-MM-dd')
        ),
      ]);

      const today = todayResult.data?.today ?? null;
      const dailyGoalMinutes = todayResult.data?.dailyGoalMinutes ?? 60;
      const thisWeek = thisWeekResult.data ?? [];
      const lastWeek = lastWeekResult.data ?? [];

      const thisWeekAggregate = aggregateWeek(thisWeek);
      const lastWeekAggregate = aggregateWeek(lastWeek);
      const comparison = compareWeeks(thisWeekAggregate, lastWeekAggregate);

      const goalProgress =
        dailyGoalMinutes > 0
          ? (today?.total_minutes ?? 0) / dailyGoalMinutes
          : 0;

      return {
        today,
        thisWeek,
        lastWeek,
        thisWeekAggregate,
        lastWeekAggregate,
        comparison,
        dailyGoalMinutes,
        goalProgress,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
