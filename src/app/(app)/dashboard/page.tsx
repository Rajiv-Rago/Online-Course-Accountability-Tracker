'use client';

import { Suspense } from 'react';
import { DashboardPage } from '@/blocks/b5-dashboard/components/dashboard-page';

export default function Page() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}
