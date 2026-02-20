import { Suspense } from 'react';
import { CourseVisualizationPage } from '@/blocks/b8-visualization/components/course-visualization-page';
import { ChartLoadingSkeleton } from '@/blocks/b8-visualization/components/chart-loading-skeleton';

export default function CourseVisualizationRoute({
  params,
}: {
  params: { id: string };
}) {
  return (
    <Suspense fallback={<ChartLoadingSkeleton height={400} />}>
      <CourseVisualizationPage courseId={params.id} />
    </Suspense>
  );
}
