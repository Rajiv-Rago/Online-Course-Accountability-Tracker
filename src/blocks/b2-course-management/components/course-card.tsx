'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { Course } from '@/lib/types';
import { calcProgress } from '../lib/course-utils';
import { getPlatformConfig } from '../lib/platform-config';
import { CourseStatusBadge } from './course-status-badge';
import { CoursePriorityBadge } from './course-priority-badge';
import { PlatformIcon } from './platform-icon';
import { CourseProgressBar } from './course-progress-bar';
import { DaysRemainingBadge } from './days-remaining-badge';
import { CourseActionMenu } from './course-action-menu';

interface CourseCardProps {
  course: Course;
  selected: boolean;
  onSelectChange: (selected: boolean) => void;
}

export function CourseCard({ course, selected, onSelectChange }: CourseCardProps) {
  const progress = calcProgress(course.completed_modules, course.total_modules);
  const platformConfig = getPlatformConfig(course.platform);

  return (
    <Card className="group relative hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Top row: checkbox, platform, priority, menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectChange(checked === true)}
              onClick={(e) => e.stopPropagation()}
            />
            <PlatformIcon platform={course.platform} size={18} />
            <span className="text-xs text-muted-foreground">
              {platformConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CoursePriorityBadge priority={course.priority} />
            <CourseActionMenu course={course} />
          </div>
        </div>

        {/* Title */}
        <Link
          href={`/courses/${course.id}`}
          className="block font-semibold hover:underline line-clamp-2"
        >
          {course.title}
        </Link>

        {/* Progress */}
        <div className="space-y-1">
          <CourseProgressBar value={progress} size="sm" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {course.completed_modules}/{course.total_modules ?? '?'} modules
            </span>
            {course.total_hours != null && (
              <span>
                {course.completed_hours}/{course.total_hours} hrs
              </span>
            )}
          </div>
        </div>

        {/* Target date */}
        <DaysRemainingBadge targetDate={course.target_completion_date} />

        {/* Status */}
        <div className="flex items-center justify-between pt-1">
          <CourseStatusBadge status={course.status} />
        </div>
      </CardContent>
    </Card>
  );
}
