'use client';

import { format, startOfWeek, addDays } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDailyStats } from '../hooks/use-daily-stats';

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

export function WeeklyStatsSummary() {
  const { data, isLoading } = useDailyStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const agg = data?.thisWeekAggregate;
  const comparison = data?.comparison;

  // Build daily bar chart data for the week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const dailyMinutes = dayLabels.map((_, i) => {
    const dayStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
    const stat = data?.thisWeek.find((s) => s.date === dayStr);
    return stat?.total_minutes ?? 0;
  });

  const maxMinutes = Math.max(...dailyMinutes, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">This Week</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">
              {formatMinutes(agg?.totalMinutes ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total study time</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{agg?.totalSessions ?? 0}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {agg?.activeDays ?? 0}
              <span className="text-base font-normal text-muted-foreground">
                /7
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Active days</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {formatMinutes(agg?.avgSessionMinutes ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">Avg session</p>
          </div>
        </div>

        {/* Comparison */}
        {comparison && (
          <div className="flex items-center gap-2 text-sm">
            {comparison.minutesDelta > 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : comparison.minutesDelta < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
            <span
              className={cn(
                'font-medium',
                comparison.minutesDelta > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : comparison.minutesDelta < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
              )}
            >
              {comparison.minutesDelta > 0 ? '+' : ''}
              {comparison.minutesDelta}%
            </span>
            <span className="text-muted-foreground">vs last week</span>
          </div>
        )}

        {/* Daily bar chart */}
        <div className="flex items-end gap-1 h-20">
          {dayLabels.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex justify-center">
                <div
                  className={cn(
                    'w-full max-w-8 rounded-t-sm transition-all',
                    dailyMinutes[i] > 0
                      ? 'bg-primary'
                      : 'bg-muted'
                  )}
                  style={{
                    height: `${Math.max(
                      4,
                      (dailyMinutes[i] / maxMinutes) * 64
                    )}px`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {label.charAt(0)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
