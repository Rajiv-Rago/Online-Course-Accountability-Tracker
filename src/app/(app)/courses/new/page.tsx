'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseForm } from '@/blocks/b2-course-management/components/course-form';

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/courses">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Add New Course</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Start tracking a new course in your learning journey.
        </p>
      </div>

      <CourseForm mode="create" />
    </div>
  );
}
