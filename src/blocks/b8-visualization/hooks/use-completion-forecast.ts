'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { getForecastData } from '../actions/visualization-actions';
import { calculateForecast, type ForecastResult } from '../lib/forecast-calculator';

export function useCompletionForecast(courseId: string | null) {
  const query = useQuery({
    queryKey: ['viz', 'forecast', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('No course selected');
      const result = await getForecastData({ courseId });
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000,
  });

  const forecast = useMemo((): ForecastResult | null => {
    if (!query.data) return null;

    const { sessions, course } = query.data;
    if (sessions.length === 0) return null;

    // Build daily cumulative hours
    const dailyMap = new Map<string, number>();
    for (const s of sessions) {
      const dateStr = format(parseISO(s.started_at), 'yyyy-MM-dd');
      dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + s.duration_minutes / 60);
    }

    const dates = Array.from(dailyMap.keys()).sort();
    let cumulative = course.completed_hours - sessions.reduce((s, sess) => s + sess.duration_minutes / 60, 0);
    cumulative = Math.max(0, cumulative);

    const dailyCumulativeHours = dates.map((date) => {
      cumulative += dailyMap.get(date) ?? 0;
      return { date, hours: Math.round(cumulative * 100) / 100 };
    });

    return calculateForecast({
      dailyCumulativeHours,
      totalCourseHours: course.total_hours,
      completedHours: course.completed_hours,
      targetDate: course.target_completion_date,
    });
  }, [query.data]);

  return {
    ...query,
    forecast,
    courseTitle: query.data?.course.title ?? '',
    targetDate: query.data?.course.target_completion_date ?? null,
  };
}
