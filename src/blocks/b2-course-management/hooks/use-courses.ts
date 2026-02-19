'use client';

import { useQuery } from '@tanstack/react-query';
import { getCourses } from '../actions/course-actions';
import type { CourseStatus, CoursePlatform, CoursePriority } from '@/lib/types';

export interface CourseFilters {
  status?: CourseStatus | 'all';
  priority?: CoursePriority | 'all';
  platform?: CoursePlatform | 'all';
  search?: string;
  sortBy?: 'priority' | 'progress' | 'name' | 'target_date' | 'created_at' | 'updated_at';
  sortDir?: 'asc' | 'desc';
}

export function useCourses(filters?: CourseFilters) {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: async () => {
      const result = await getCourses(filters);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}
