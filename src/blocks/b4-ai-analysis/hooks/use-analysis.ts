'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchLatestAnalyses,
  fetchAnalysisHistory,
  type AnalysisWithCourse,
} from '../actions/analysis-actions';
import type { AiAnalysis } from '@/lib/types';

export function useLatestAnalyses() {
  return useQuery<AnalysisWithCourse[]>({
    queryKey: ['analyses', 'latest'],
    queryFn: async () => {
      const result = await fetchLatestAnalyses();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

export function useAnalysisHistory(courseId: string) {
  return useQuery<AiAnalysis[]>({
    queryKey: ['analyses', 'history', courseId],
    queryFn: async () => {
      const result = await fetchAnalysisHistory(courseId);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
