'use client';

import { useMemo } from 'react';
import type { Course } from '@/lib/types';
import { calcProgress, calcDaysRemaining, calcRequiredPace } from '../lib/course-utils';

export function useCourseStats(course: Course) {
  return useMemo(() => {
    const progressPercent = calcProgress(
      course.completed_modules,
      course.total_modules
    );

    const hoursPercent = calcProgress(
      course.completed_hours,
      course.total_hours
    );

    const daysRemaining = calcDaysRemaining(course.target_completion_date);

    const daysElapsed = course.created_at
      ? Math.floor(
          (Date.now() - new Date(course.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    const remainingHours =
      course.total_hours != null
        ? course.total_hours - course.completed_hours
        : null;

    const paceRequired =
      remainingHours !== null && daysRemaining !== null && daysRemaining > 0
        ? calcRequiredPace(remainingHours, daysRemaining)
        : null;

    const currentPace =
      daysElapsed && daysElapsed > 0
        ? Math.round((course.completed_hours / daysElapsed) * 10) / 10
        : null;

    const isOnTrack =
      paceRequired !== null && currentPace !== null
        ? currentPace >= paceRequired
        : null;

    const isOverdue = daysRemaining !== null && daysRemaining < 0;

    return {
      progressPercent,
      hoursPercent,
      daysRemaining,
      daysElapsed,
      paceRequired,
      currentPace,
      isOnTrack,
      isOverdue,
    };
  }, [course]);
}
