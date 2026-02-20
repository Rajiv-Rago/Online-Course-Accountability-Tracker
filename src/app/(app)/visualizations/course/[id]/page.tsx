'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { CourseVisualizationPage } from '@/blocks/b8-visualization/components/course-visualization-page';
import { ChartLoadingSkeleton } from '@/blocks/b8-visualization/components/chart-loading-skeleton';

export default function CourseVisualizationRoute() {
  const params = useParams();
  const courseId = params.id as string;

  return (
    <Suspense fallback={<ChartLoadingSkeleton height={400} />}>
      <CourseVisualizationPage courseId={courseId} />
    </Suspense>
  );
}
