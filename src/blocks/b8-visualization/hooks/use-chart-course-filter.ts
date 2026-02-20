'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserCourses } from '../actions/visualization-actions';
import { getCourseColor } from '../lib/chart-colors';

export interface CourseFilterState {
  selectedCourseIds: string[];
  setSelectedCourseIds: (ids: string[]) => void;
  courses: { id: string; title: string; color: string }[];
  isAllSelected: boolean;
  isLoading: boolean;
}

export function useChartCourseFilter(): CourseFilterState {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data: courseOptions = [], isLoading } = useQuery({
    queryKey: ['viz-courses'],
    queryFn: async () => {
      const result = await getUserCourses();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 60_000,
  });

  const courses = useMemo(
    () =>
      courseOptions.map((c, i) => ({
        id: c.id,
        title: c.title,
        color: getCourseColor(i),
      })),
    [courseOptions],
  );

  const selectedCourseIds = useMemo(() => {
    const param = searchParams.get('courses');
    if (!param) return [];
    return param.split(',').filter(Boolean);
  }, [searchParams]);

  const isAllSelected = selectedCourseIds.length === 0;

  const setSelectedCourseIds = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (ids.length === 0 || ids.length === courses.length) {
        params.delete('courses');
      } else {
        params.set('courses', ids.join(','));
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname, courses.length],
  );

  return { selectedCourseIds, setSelectedCourseIds, courses, isAllSelected, isLoading };
}
