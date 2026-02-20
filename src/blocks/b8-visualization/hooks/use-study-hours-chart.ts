'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getStudyHoursData } from '../actions/visualization-actions';
import { groupSessionsByPeriod, type GroupedHoursPoint } from '../lib/chart-utils';
import { getCourseColor } from '../lib/chart-colors';
import type { DateRange } from '../lib/date-utils';

export interface StudyHoursChartData {
  points: GroupedHoursPoint[];
  courses: { id: string; title: string; color: string }[];
  totalHours: number;
  goalLineHours: number;
}

export function useStudyHoursChart(
  courseIds: string[],
  dateRange: DateRange,
  period: 'day' | 'week' | 'month',
) {
  const query = useQuery({
    queryKey: ['viz', 'hours', courseIds, dateRange.startDate, dateRange.endDate, period],
    queryFn: async () => {
      const result = await getStudyHoursData({
        courseIds,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo((): StudyHoursChartData => {
    if (!query.data) {
      return { points: [], courses: [], totalHours: 0, goalLineHours: 0 };
    }

    const { sessions, dailyGoalMins } = query.data;
    const points = groupSessionsByPeriod(sessions, period);

    // Get unique course IDs from sessions
    const uniqueCourseIds = Array.from(new Set(sessions.map((s) => s.course_id)));

    // Build course list (we don't have titles from this endpoint, use ID abbreviated)
    const courses = uniqueCourseIds.map((id, i) => ({
      id,
      title: id, // Will be resolved in the component via the course filter
      color: getCourseColor(i),
    }));

    const totalHours = points.reduce((sum, p) => sum + p.total, 0);

    // Calculate goal based on period
    let goalLineHours = dailyGoalMins / 60;
    if (period === 'week') goalLineHours *= 7;
    if (period === 'month') goalLineHours *= 30;

    return { points, courses, totalHours, goalLineHours };
  }, [query.data, period]);

  return { ...query, chartData };
}
