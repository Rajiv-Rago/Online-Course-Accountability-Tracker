'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DashboardCourseCard } from './dashboard-course-card';
import type { DashboardCourseData } from '../lib/dashboard-utils';

interface CourseCardsGridProps {
  courses: DashboardCourseData[];
}

export function CourseCardsGrid({ courses }: CourseCardsGridProps) {
  const [showAll, setShowAll] = useState(false);

  const activeCourses = courses.filter(
    (c) => c.status === 'in_progress' || c.status === 'not_started'
  );
  const displayCourses = showAll ? courses : activeCourses;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Courses</h2>
          {courses.length > activeCourses.length && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAll ? 'Active only' : `Show all (${courses.length})`}
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/courses/new">
            <Plus className="h-4 w-4 mr-1" />
            Add Course
          </Link>
        </Button>
      </div>
      {displayCourses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No active courses. Add a course to get started!
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {displayCourses.map((course) => (
            <DashboardCourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
