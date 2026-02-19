'use client';

import Link from 'next/link';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CourseEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Start tracking your learning journey by adding your first course.
      </p>
      <Button asChild>
        <Link href="/courses/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Course
        </Link>
      </Button>
    </div>
  );
}
