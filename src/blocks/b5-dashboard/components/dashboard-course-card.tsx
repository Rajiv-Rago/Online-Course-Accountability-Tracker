'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play } from 'lucide-react';
import {
  calcProgress,
  calcDaysRemaining,
  getRiskBadgeVariant,
  formatRelativeTime,
  type DashboardCourseData,
} from '../lib/dashboard-utils';

interface DashboardCourseCardProps {
  course: DashboardCourseData;
}

export function DashboardCourseCard({ course }: DashboardCourseCardProps) {
  const progress = calcProgress(
    course.completedModules,
    course.totalModules ?? undefined,
    course.completedHours,
    course.totalHours ?? undefined
  );
  const daysRemaining = calcDaysRemaining(course.targetCompletionDate);

  return (
    <Card className="group hover:border-primary/30 transition-colors">
      <Link href={`/courses/${course.id}`} className="block">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {course.title}
              </h3>
              {course.platform && (
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {course.platform}
                </p>
              )}
            </div>
            {course.riskLevel && (
              <Badge
                variant={getRiskBadgeVariant(course.riskLevel)}
                className="shrink-0 text-[10px]"
              >
                {course.riskLevel}
              </Badge>
            )}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{progress}%</span>
              {course.totalModules && (
                <span>
                  {course.completedModules}/{course.totalModules} modules
                </span>
              )}
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {daysRemaining !== null && (
                <span>{daysRemaining === 0 ? 'Due today' : `${daysRemaining}d left`}</span>
              )}
              {course.lastStudiedAt && (
                <span>{formatRelativeTime(course.lastStudiedAt)}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/progress/timer?course=${course.id}`}>
            <Play className="h-3.5 w-3.5" />
            <span className="sr-only">Start studying {course.title}</span>
          </Link>
        </Button>
      </div>
    </Card>
  );
}
