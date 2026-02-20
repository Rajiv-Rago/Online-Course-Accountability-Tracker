'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getSessionDistribution } from '../actions/visualization-actions';
import {
  bucketSessionDurations,
  calculateAverageDuration,
  calculateMedianDuration,
  type DistributionBucket,
} from '../lib/chart-utils';
import type { DateRange } from '../lib/date-utils';

export interface DistributionChartData {
  buckets: DistributionBucket[];
  averageDuration: number;
  medianDuration: number;
  totalSessions: number;
}

export function useSessionDistribution(courseIds: string[], dateRange: DateRange) {
  const query = useQuery({
    queryKey: ['viz', 'distribution', courseIds, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const result = await getSessionDistribution({
        courseIds,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo((): DistributionChartData => {
    if (!query.data || query.data.length === 0) {
      return { buckets: [], averageDuration: 0, medianDuration: 0, totalSessions: 0 };
    }

    return {
      buckets: bucketSessionDurations(query.data),
      averageDuration: calculateAverageDuration(query.data),
      medianDuration: calculateMedianDuration(query.data),
      totalSessions: query.data.length,
    };
  }, [query.data]);

  return { ...query, chartData };
}
