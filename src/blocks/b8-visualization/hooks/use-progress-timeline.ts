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

    // Build cumulative hours per course per day
    const courseMap = new Map(courses.map((c, i) => [c.id, { ...c, color: getCourseColor(i) }]));
    const cumulativeByDate = new Map<string, Record<string, number>>();

    // Track running totals
    const runningHours: Record<string, number> = {};
    for (const c of courses) {
      runningHours[c.id] = 0;
    }

    for (const session of sessions) {
      const dateStr = format(parseISO(session.started_at), 'yyyy-MM-dd');
      runningHours[session.course_id] =
        (runningHours[session.course_id] || 0) + session.duration_minutes / 60;

      if (!cumulativeByDate.has(dateStr)) {
        cumulativeByDate.set(dateStr, {});
      }
      // Snapshot all running totals for this date
      const snapshot = cumulativeByDate.get(dateStr)!;
      for (const cId of Object.keys(runningHours)) {
        snapshot[cId] = runningHours[cId];
      }
    }

    // Convert to progress percent
    const points: ProgressDataPoint[] = [];
    for (const [dateStr, snapshot] of Array.from(cumulativeByDate.entries()).sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      const point: ProgressDataPoint = { date: dateStr };
      for (const course of courses) {
        const hours = snapshot[course.id] || 0;
        if (course.total_hours && course.total_hours > 0) {
          point[course.id] = Math.min(100, Math.round((hours / course.total_hours) * 100));
        } else if (course.total_modules && course.total_modules > 0) {
          point[course.id] = Math.min(
            100,
            Math.round((course.completed_modules / course.total_modules) * 100),
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
