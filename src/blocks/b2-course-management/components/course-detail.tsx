'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourse } from '../hooks/use-course';
import { useCourseStats } from '../hooks/use-course-stats';
import { calcProgress, getAvailableTransitions, getTransitionLabel, requiresConfirmation, formatStatus } from '../lib/course-utils';
import { getPlatformConfig } from '../lib/platform-config';
import { CourseStatusBadge } from './course-status-badge';
import { CoursePriorityBadge } from './course-priority-badge';
import { PlatformIcon } from './platform-icon';
import { CourseProgressBar } from './course-progress-bar';
import { CourseStatsPanel } from './course-stats-panel';
import { CourseActionMenu } from './course-action-menu';
import { StatusTransitionDialog } from './status-transition-dialog';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { useCourseMutations } from '../hooks/use-course-mutations';
import { format } from 'date-fns';
import type { CourseStatus } from '@/lib/types';

interface CourseDetailProps {
  courseId: string;
}

export function CourseDetail({ courseId }: CourseDetailProps) {
  const { data, isLoading, error } = useCourse(courseId);
  const [statusDialog, setStatusDialog] = useState<CourseStatus | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const mutations = useCourseMutations();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[300px] lg:col-span-2" />
          <Skeleton className="h-[300px]" />
        </div>
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

  const { course, recentSessions, stats: sessionStats } = data;
  const progress = calcProgress(course.completed_modules, course.total_modules);
  const platformConfig = getPlatformConfig(course.platform);
  const transitions = getAvailableTransitions(course.status);

  const handleTransition = (newStatus: CourseStatus) => {
    if (requiresConfirmation(course.status, newStatus)) {
      setStatusDialog(newStatus);
    } else {
      mutations.transitionStatus.mutate({ courseId: course.id, newStatus });
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link and actions */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/courses/${course.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <CourseActionMenu course={course} />
        </div>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <PlatformIcon platform={course.platform} size={24} />
            <span className="text-sm text-muted-foreground">
              {platformConfig.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          {course.url && (
            <a
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {course.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <div className="flex flex-wrap gap-2">
            <CourseStatusBadge status={course.status} />
            <CoursePriorityBadge priority={course.priority} />
          </div>
        </CardContent>
      </Card>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Progress + Status Actions + Notes + Sessions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <CourseProgressBar value={progress} showLabel={false} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Modules</span>
                  <p className="font-medium">
                    {course.completed_modules} / {course.total_modules ?? '?'} completed
                  </p>
                </div>
                {course.total_hours != null && (
                  <div>
                    <span className="text-muted-foreground">Hours</span>
                    <p className="font-medium">
                      {course.completed_hours} / {course.total_hours} hours
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Actions */}
          {transitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Current: {formatStatus(course.status)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {transitions.map((status) => (
                    <Button
                      key={status}
                      variant={
                        status === 'abandoned' ? 'destructive' : 'outline'
                      }
                      size="sm"
                      onClick={() => handleTransition(status)}
                    >
                      {getTransitionLabel(course.status, status)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {course.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{course.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Study Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No study sessions recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                    >
                      <div>
                        <span className="font-medium">
                          {format(new Date(session.started_at), 'MMM d, yyyy')}
                        </span>
                        {session.notes && (
                          <span className="text-muted-foreground ml-2">
                            &mdash; {session.notes}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{session.duration_minutes} min</span>
                        {session.modules_completed > 0 && (
                          <span>
                            {session.modules_completed} module
                            {session.modules_completed > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar: Stats */}
        <div>
          <CourseStatsPanel course={course} sessionStats={sessionStats} />
        </div>
      </div>

      {/* Dialogs */}
      {statusDialog && (
        <StatusTransitionDialog
          course={course}
          newStatus={statusDialog}
          open={!!statusDialog}
          onOpenChange={(open) => !open && setStatusDialog(null)}
        />
      )}
      <DeleteConfirmDialog
        course={course}
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        redirectOnDelete
      />
    </div>
  );
}
