'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { getProgressTimeline } from '../actions/visualization-actions';
import { getCourseColor } from '../lib/chart-colors';
import type { DateRange } from '../lib/date-utils';

export interface ProgressDataPoint {
  date: string;
  [courseId: string]: number | string;
}

export function useProgressTimeline(courseIds: string[], dateRange: DateRange) {
  const query = useQuery({
    queryKey: ['viz', 'progress', courseIds, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const result = await getProgressTimeline({
        courseIds,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo(() => {
    if (!query.data) return { points: [] as ProgressDataPoint[], courses: [] as { id: string; title: string; color: string }[] };

    const { sessions, courses } = query.data;

    // Build cumulative hours and modules per course per day
    const cumulativeByDate = new Map<string, { hours: Record<string, number>; modules: Record<string, number> }>();

    // Track running totals
    const runningHours: Record<string, number> = {};
    const runningModules: Record<string, number> = {};
    for (const c of courses) {
      runningHours[c.id] = 0;
      runningModules[c.id] = 0;
    }

    for (const session of sessions) {
      const dateStr = format(parseISO(session.started_at), 'yyyy-MM-dd');
      runningHours[session.course_id] =
        (runningHours[session.course_id] || 0) + session.duration_minutes / 60;
      if (session.modules_completed) {
        runningModules[session.course_id] =
          (runningModules[session.course_id] || 0) + session.modules_completed;
      }

      // Snapshot all running totals for this date
      cumulativeByDate.set(dateStr, {
        hours: { ...runningHours },
        modules: { ...runningModules },
      });
    }

    // Convert to progress percent
    const points: ProgressDataPoint[] = [];
    for (const [dateStr, snapshot] of Array.from(cumulativeByDate.entries()).sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      const point: ProgressDataPoint = { date: dateStr };
      for (const course of courses) {
        const hours = snapshot.hours[course.id] || 0;
        if (course.total_hours && course.total_hours > 0) {
          point[course.id] = Math.min(100, Math.round((hours / course.total_hours) * 100));
        } else if (course.total_modules && course.total_modules > 0) {
          const modules = snapshot.modules[course.id] || 0;
          point[course.id] = Math.min(
            100,
            Math.round((modules / course.total_modules) * 100),
          );
        } else {
          point[course.id] = 0;
        }
      }
      points.push(point);
    }

    return {
      points,
      courses: courses.map((c, i) => ({ id: c.id, title: c.title, color: getCourseColor(i) })),
    };
  }, [query.data]);

  return { ...query, chartData };
}
