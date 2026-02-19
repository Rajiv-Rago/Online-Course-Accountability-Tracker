'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseForm } from '@/blocks/b2-course-management/components/course-form';
import { useCourse } from '@/blocks/b2-course-management/hooks/use-course';

export default function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useCourse(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] max-w-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">Course not found</p>
        <Button asChild variant="outline">
          <Link href="/courses">Back to Courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/courses/${id}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Edit Course</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update course details and progress.
        </p>
      </div>

      <CourseForm mode="edit" course={data.course} />
    </div>
  );
}
