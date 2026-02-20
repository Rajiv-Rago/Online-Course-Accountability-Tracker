'use client';

import { useQuery } from '@tanstack/react-query';
import { getHeatmapData } from '../actions/visualization-actions';
import {
  generateHeatmapGrid,
  calculateHeatmapSummary,
  type HeatmapCell,
  type HeatmapSummary,
} from '../lib/heatmap-utils';

export interface HeatmapQueryData {
  cells: HeatmapCell[];
  totalWeeks: number;
  summary: HeatmapSummary;
}

export function useHeatmapData(year: number) {
  return useQuery({
    queryKey: ['viz', 'heatmap', year],
    queryFn: async (): Promise<HeatmapQueryData> => {
      const result = await getHeatmapData({ year });
      if (result.error) throw new Error(result.error);

      const grid = generateHeatmapGrid(year, result.data!);
      const summary = calculateHeatmapSummary(grid.cells);

      return { ...grid, summary };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
