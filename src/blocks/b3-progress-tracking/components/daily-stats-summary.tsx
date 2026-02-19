'use client';

import { Clock, BookOpen, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

export function DailyStatsSummary() {
  const { data, isLoading } = useDailyStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const todayMinutes = data?.today?.total_minutes ?? 0;
  const todaySessions = data?.today?.session_count ?? 0;
  const todayModules = data?.today?.modules_completed ?? 0;
  const goalMinutes = data?.dailyGoalMinutes ?? 60;
  const goalProgress = Math.min(data?.goalProgress ?? 0, 1);
  const goalPercent = Math.round(goalProgress * 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 px-4 flex flex-col items-center text-center">
            <Clock className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold tabular-nums">
              {formatMinutes(todayMinutes)}
            </p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4 flex flex-col items-center text-center">
            <BarChart3 className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold tabular-nums">{todaySessions}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4 flex flex-col items-center text-center">
            <BookOpen className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold tabular-nums">{todayModules}</p>
            <p className="text-xs text-muted-foreground">Modules</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Goal Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily Goal</span>
          <span className="font-medium">
            {goalPercent}% ({formatMinutes(todayMinutes)}/{formatMinutes(goalMinutes)})
          </span>
        </div>
        <Progress
          value={goalPercent}
          className={cn(
            'h-2',
            goalPercent >= 100
              ? '[&>div]:bg-emerald-500'
              : goalPercent >= 50
              ? '[&>div]:bg-yellow-500'
              : ''
          )}
        />
      </div>
    </div>
  );
}
