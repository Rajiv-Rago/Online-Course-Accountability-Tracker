'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchRiskSummary, type RiskSummary } from '../actions/analysis-actions';

export function useRiskSummary() {
  return useQuery<RiskSummary>({
    queryKey: ['risk-summary'],
    queryFn: async () => {
      const result = await fetchRiskSummary();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
