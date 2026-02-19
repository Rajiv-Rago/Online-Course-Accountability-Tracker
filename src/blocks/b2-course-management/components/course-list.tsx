'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourses } from '../hooks/use-courses';
import { useCourseFilters } from '../hooks/use-course-filters';
import { CourseCard } from './course-card';
import { CourseFilters } from './course-filters';
import { CourseSort } from './course-sort';
import { BulkActionsBar } from './bulk-actions-bar';
import { CourseEmptyState } from './course-empty-state';

function CourseListContent() {
  const { filters } = useCourseFilters();
  const { data: courses, isLoading, error } = useCourses(filters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[220px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">Failed to load courses</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return <CourseEmptyState />;
  }

  return (
    <div className="space-y-4">
      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            selected={selectedIds.has(course.id)}
            onSelectChange={(selected) =>
              toggleSelection(course.id, selected)
            }
          />
        ))}
      </div>
    </div>
  );
}

export function CourseList() {
  const { data: courses } = useCourses();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          {courses && (
            <p className="text-sm text-muted-foreground">
              {courses.length} course{courses.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/courses/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Link>
        </Button>
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <Suspense>
          <CourseFilters />
        </Suspense>
        <Suspense>
          <CourseSort />
        </Suspense>
      </div>

      {/* Course Grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[220px] rounded-lg" />
            ))}
          </div>
        }
      >
        <CourseListContent />
      </Suspense>
    </div>
  );
}
