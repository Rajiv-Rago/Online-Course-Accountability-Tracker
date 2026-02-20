'use client';

import { Suspense } from 'react';
import { HeatmapFullPage } from '@/blocks/b8-visualization/components/heatmap-full-page';
import { ChartLoadingSkeleton } from '@/blocks/b8-visualization/components/chart-loading-skeleton';

export default function StudyHeatmapRoute() {
  return (
    <Suspense fallback={<ChartLoadingSkeleton height={400} />}>
      <HeatmapFullPage />
    </Suspense>
  );
}
