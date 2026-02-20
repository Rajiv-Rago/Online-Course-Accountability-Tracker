'use client';

import { Suspense } from 'react';
import { VisualizationPage } from '@/blocks/b8-visualization/components/visualization-page';
import { ChartLoadingSkeleton } from '@/blocks/b8-visualization/components/chart-loading-skeleton';

export default function VisualizationsRoute() {
  return (
    <Suspense fallback={<ChartLoadingSkeleton height={400} />}>
      <VisualizationPage />
    </Suspense>
  );
}
