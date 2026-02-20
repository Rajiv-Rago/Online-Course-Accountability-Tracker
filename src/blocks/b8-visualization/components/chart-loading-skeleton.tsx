'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface ChartLoadingSkeletonProps {
  height?: number;
}

export function ChartLoadingSkeleton({ height = 300 }: ChartLoadingSkeletonProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}
