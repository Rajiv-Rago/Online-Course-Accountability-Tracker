'use client';

import { useQuery } from '@tanstack/react-query';
import { Flame, Trophy, Snowflake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DailyStat } from '@/lib/types';
import { useStreak } from '../hooks/use-streak';
import { fetchDailyStats } from '../actions/stats-actions';
import { subDays, format } from 'date-fns';
import { StreakCalendar } from './streak-calendar';
import { StreakFreezeButton } from './streak-freeze-button';

export function StreakDisplay() {
  const { data: streakData, isLoading, applyFreeze } = useStreak();

  const today = new Date();
  const ninetyDaysAgo = subDays(today, 89);

  const { data: calendarStats } = useQuery({
    queryKey: ['streak-calendar'],
    queryFn: async () => {
      const result = await fetchDailyStats(
        format(ninetyDaysAgo, 'yyyy-MM-dd'),
        format(today, 'yyyy-MM-dd')
      );
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    staleTime: 60_000,
  });

  const handleFreeze = () => {
    const yesterday = subDays(new Date(), 1);
    applyFreeze.mutate(format(yesterday, 'yyyy-MM-dd'));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Streak</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {streakData?.currentStreak ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Current</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {streakData?.longestStreak ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Longest</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {streakData?.freezeCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Freezes</p>
            </div>
          </div>
        </div>

        {/* Calendar */}
        {calendarStats && (
          <StreakCalendar dailyStats={calendarStats} today={today} />
        )}

        {/* Freeze button */}
        {streakData && !streakData.isStudiedToday && (
          <StreakFreezeButton
            freezeCount={streakData.freezeCount}
            onFreeze={handleFreeze}
            isLoading={applyFreeze.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
