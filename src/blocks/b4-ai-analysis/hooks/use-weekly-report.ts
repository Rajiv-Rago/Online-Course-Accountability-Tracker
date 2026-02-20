'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchWeeklyReport,
  fetchWeeklyReportDates,
} from '../actions/analysis-actions';
import type { WeeklyReport } from '@/lib/types';

export function useWeeklyReport(weekStart?: string) {
  return useQuery<WeeklyReport | null>({
    queryKey: ['weekly-report', weekStart ?? 'latest'],
    queryFn: async () => {
      const result = await fetchWeeklyReport(weekStart);
      if (result.error) throw new Error(result.error);
      return result.data ?? null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}

export function useWeeklyReportDates() {
  return useQuery<string[]>({
    queryKey: ['weekly-report-dates'],
    queryFn: async () => {
      const result = await fetchWeeklyReportDates();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 10 * 60 * 1000,
  });
}
