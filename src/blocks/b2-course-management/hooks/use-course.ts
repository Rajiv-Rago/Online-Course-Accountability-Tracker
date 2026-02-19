'use client';

import { useQuery } from '@tanstack/react-query';
import { getCourse, getCourseRecentSessions, getCourseStats } from '../actions/course-actions';
import type { Course, StudySession } from '@/lib/types';

interface CourseDetail {
  course: Course;
  recentSessions: StudySession[];
  stats: {
    total_sessions: number;
    total_minutes: number;
    avg_session_minutes: number;
    last_session_at: string | null;
  };
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: async (): Promise<CourseDetail> => {
      const [courseResult, sessionsResult, statsResult] = await Promise.all([
        getCourse(courseId),
        getCourseRecentSessions(courseId),
        getCourseStats(courseId),
      ]);

      if (courseResult.error) throw new Error(courseResult.error);
      if (!courseResult.data) throw new Error('Course not found');

      return {
        course: courseResult.data,
        recentSessions: (sessionsResult.data || []) as StudySession[],
        stats: statsResult.data || {
          total_sessions: 0,
          total_minutes: 0,
          avg_session_minutes: 0,
          last_session_at: null,
        },
      };
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: !!courseId,
  });
}
