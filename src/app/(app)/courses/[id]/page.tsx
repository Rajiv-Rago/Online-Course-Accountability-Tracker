'use client';

import { use } from 'react';
import { CourseDetail } from '@/blocks/b2-course-management/components/course-detail';

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CourseDetail courseId={id} />;
}
