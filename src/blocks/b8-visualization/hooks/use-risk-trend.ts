'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { getRiskTrendData } from '../actions/visualization-actions';
import { getCourseColor } from '../lib/chart-colors';
import type { DateRange } from '../lib/date-utils';

export interface RiskDataPoint {
  date: string;
  aggregate: number;
  [courseId: string]: number | string;
}

export function useRiskTrend(courseIds: string[], dateRange: DateRange) {
  const query = useQuery({
    queryKey: ['viz', 'risk', courseIds, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const result = await getRiskTrendData({
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
    if (!query.data || query.data.length === 0) {
      return { points: [] as RiskDataPoint[], courseColors: new Map<string, string>() };
    }

    // Group by date, compute aggregate and per-course
    const dateMap = new Map<string, Map<string, number[]>>();
    const allCourseIds = new Set<string>();

    for (const row of query.data) {
      const dateStr = format(parseISO(row.created_at), 'yyyy-MM-dd');
      if (!dateMap.has(dateStr)) dateMap.set(dateStr, new Map());
      const courseScores = dateMap.get(dateStr)!;

      const cId = row.course_id || 'unknown';
      allCourseIds.add(cId);
      if (!courseScores.has(cId)) courseScores.set(cId, []);
      courseScores.get(cId)!.push(row.risk_score ?? 0);
    }

    const courseIdArray = Array.from(allCourseIds);
    const courseColorMap = new Map<string, string>();
    courseIdArray.forEach((id, i) => courseColorMap.set(id, getCourseColor(i)));

    const points: RiskDataPoint[] = [];
    for (const [dateStr, courseScores] of Array.from(dateMap.entries()).sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      const point: RiskDataPoint = { date: dateStr, aggregate: 0 };
      let totalScore = 0;
      let count = 0;

      for (const [cId, scores] of Array.from(courseScores.entries())) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        point[cId] = Math.round(avg);
        totalScore += avg;
        count++;
      }

      point.aggregate = count > 0 ? Math.round(totalScore / count) : 0;
      points.push(point);
    }

    return { points, courseColors: courseColorMap };
  }, [query.data]);

  return { ...query, chartData };
}
