'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Course } from '@/lib/types';
import { useCourseStats } from '../hooks/use-course-stats';
import { format } from 'date-fns';

interface CourseStatsPanelProps {
  course: Course;
  sessionStats?: {
    total_sessions: number;
    total_minutes: number;
    avg_session_minutes: number;
    last_session_at: string | null;
  };
}

export function CourseStatsPanel({ course, sessionStats }: CourseStatsPanelProps) {
  const stats = useCourseStats(course);

  const totalHours = sessionStats
    ? Math.round((sessionStats.total_minutes / 60) * 10) / 10
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {sessionStats && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Sessions</span>
              <span className="font-medium">{sessionStats.total_sessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Time</span>
              <span className="font-medium">{totalHours} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Session</span>
              <span className="font-medium">
                {sessionStats.avg_session_minutes} min
              </span>
            </div>
          </>
        )}

        <Separator />

        <div className="flex justify-between">
          <span className="text-muted-foreground">Started</span>
          <span className="font-medium">
            {course.created_at
              ? format(new Date(course.created_at), 'MMM d, yyyy')
              : '--'}
          </span>
        </div>
        {course.target_completion_date && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target</span>
            <span className="font-medium">
              {format(new Date(course.target_completion_date), 'MMM d, yyyy')}
            </span>
          </div>
        )}
        {stats.daysRemaining !== null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Days Left</span>
            <span
              className={`font-medium ${
                stats.isOverdue ? 'text-destructive' : ''
              }`}
            >
              {stats.isOverdue
                ? `${Math.abs(stats.daysRemaining)} overdue`
                : stats.daysRemaining}
            </span>
          </div>
        )}
        {stats.daysElapsed !== null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Days Elapsed</span>
            <span className="font-medium">{stats.daysElapsed}</span>
          </div>
        )}

        {stats.paceRequired !== null && (
          <>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pace Needed</span>
              <span className="font-medium">{stats.paceRequired} hrs/day</span>
            </div>
            {stats.isOnTrack !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={`font-medium ${
                    stats.isOnTrack
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-orange-600 dark:text-orange-400'
                  }`}
                >
                  {stats.isOnTrack ? 'On Track' : 'Behind Schedule'}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
