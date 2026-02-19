'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressOverview } from '@/blocks/b3-progress-tracking/components/progress-overview';

export default function ProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <ProgressOverview />
    </Suspense>
  );
}
