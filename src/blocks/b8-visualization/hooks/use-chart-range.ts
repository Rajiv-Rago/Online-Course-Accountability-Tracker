'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { getDateRange, type RangePreset, type DateRange } from '../lib/date-utils';

export type ChartRange = RangePreset | 'custom';

export interface ChartRangeState {
  range: ChartRange;
  dateRange: DateRange;
  setRange: (range: RangePreset) => void;
  setCustomRange: (start: string, end: string) => void;
}

export function useChartRange(): ChartRangeState {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const range = useMemo<ChartRange>(() => {
    const r = searchParams.get('range');
    if (r && ['7d', '30d', '90d', '1y', 'all'].includes(r)) {
      return r as RangePreset;
    }
    if (searchParams.get('start') && searchParams.get('end')) {
      return 'custom';
    }
    return '30d';
  }, [searchParams]);

  const dateRange = useMemo<DateRange>(() => {
    if (range === 'custom') {
      return {
        startDate: searchParams.get('start') || new Date('2020-01-01').toISOString(),
        endDate: searchParams.get('end') || new Date().toISOString(),
      };
    }
    return getDateRange(range);
  }, [range, searchParams]);

  const setRange = useCallback(
    (newRange: RangePreset) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('range', newRange);
      params.delete('start');
      params.delete('end');
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const setCustomRange = useCallback(
    (start: string, end: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('range');
      params.set('start', start);
      params.set('end', end);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return { range, dateRange, setRange, setCustomRange };
}
