'use client';

import { useQuery } from '@tanstack/react-query';
import { getStudyHoursData } from '../actions/visualization-actions';
import { detectPatterns, type PatternInsight } from '../lib/pattern-detector';
import type { DateRange } from '../lib/date-utils';

export interface PatternInsightsData {
  insights: PatternInsight[];
  hasSufficientData: boolean;
}

export function usePatternInsights(courseIds: string[], dateRange: DateRange) {
  return useQuery({
    queryKey: ['viz', 'patterns', dateRange.startDate, dateRange.endDate, courseIds],
    queryFn: async (): Promise<PatternInsightsData> => {
      const result = await getStudyHoursData({
        courseIds,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (result.error) throw new Error(result.error);

      const sessions = result.data!.sessions;
      const dates = new Set(sessions.map((s) => s.started_at.split('T')[0]));
      const hasSufficientData = dates.size >= 14 && sessions.length >= 10;

      const insights = hasSufficientData ? detectPatterns(sessions) : [];

      return { insights, hasSufficientData };
    },
    staleTime: 10 * 60 * 1000,
  });
}
