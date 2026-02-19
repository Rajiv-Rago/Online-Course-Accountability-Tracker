'use client';

import { useMemo } from 'react';
import { subDays, format, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DailyStat } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StreakCalendarProps {
  dailyStats: DailyStat[];
  today: Date;
}

function getIntensity(
  minutes: number,
  streakDay: boolean
): 'none' | 'freeze' | 'low' | 'medium' | 'high' {
  if (streakDay && minutes === 0) return 'freeze';
  if (minutes === 0) return 'none';
  if (minutes < 15) return 'low';
  if (minutes < 60) return 'medium';
  return 'high';
}

const intensityClasses = {
  none: 'bg-muted',
  freeze: 'bg-blue-200 dark:bg-blue-900',
  low: 'bg-emerald-200 dark:bg-emerald-900',
  medium: 'bg-emerald-400 dark:bg-emerald-700',
  high: 'bg-emerald-600 dark:bg-emerald-500',
};

export function StreakCalendar({ dailyStats, today }: StreakCalendarProps) {
  const { grid, dayLabels } = useMemo(() => {
    // Build lookup map
    const statsMap = new Map<string, DailyStat>();
    for (const stat of dailyStats) {
      statsMap.set(stat.date, stat);
    }

    // Generate 90-day grid (13 weeks)
    const startDate = subDays(today, 89);
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });

    const weeks: Array<
      Array<{
        date: Date;
        dateStr: string;
        minutes: number;
        streakDay: boolean;
        isToday: boolean;
        inRange: boolean;
      }>
    > = [];

    let current = weekStart;
    const todayStr = format(today, 'yyyy-MM-dd');
    const startStr = format(startDate, 'yyyy-MM-dd');

    while (current <= today) {
      const week: typeof weeks[0] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = format(current, 'yyyy-MM-dd');
        const stat = statsMap.get(dateStr);
        week.push({
          date: new Date(current),
          dateStr,
          minutes: stat?.total_minutes ?? 0,
          streakDay: stat?.streak_day ?? false,
          isToday: dateStr === todayStr,
          inRange: dateStr >= startStr && dateStr <= todayStr,
        });
        current = addDays(current, 1);
      }
      weeks.push(week);
    }

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return { grid: weeks, dayLabels: labels };
  }, [dailyStats, today]);

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {dayLabels.map((label, i) => (
            <div
              key={label}
              className={cn(
                'h-3 w-6 text-[10px] text-muted-foreground leading-3',
                i % 2 !== 0 && 'invisible'
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <TooltipProvider delayDuration={100}>
          <div className="flex gap-1 overflow-x-auto">
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => {
                  if (!day.inRange) {
                    return (
                      <div key={day.dateStr} className="h-3 w-3 rounded-sm" />
                    );
                  }
                  const intensity = getIntensity(day.minutes, day.streakDay);
                  return (
                    <Tooltip key={day.dateStr}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'h-3 w-3 rounded-sm transition-colors',
                            intensityClasses[intensity],
                            day.isToday && 'ring-1 ring-foreground'
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">
                          {format(day.date, 'MMM d, yyyy')}
                        </p>
                        <p>
                          {day.minutes > 0
                            ? `${day.minutes} min`
                            : day.streakDay
                            ? 'Freeze day'
                            : 'No study'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Less</span>
        {(['none', 'low', 'medium', 'high'] as const).map((level) => (
          <div
            key={level}
            className={cn('h-3 w-3 rounded-sm', intensityClasses[level])}
          />
        ))}
        <span>More</span>
        <div className="ml-2 flex items-center gap-1">
          <div className={cn('h-3 w-3 rounded-sm', intensityClasses.freeze)} />
          <span>Freeze</span>
        </div>
      </div>
    </div>
  );
}
