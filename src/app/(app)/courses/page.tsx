'use client';

import { Suspense } from 'react';
import { CourseList } from '@/blocks/b2-course-management/components/course-list';

export default function CoursesPage() {
  return (
    <Suspense>
      <CourseList />
    </Suspense>
  );
}
