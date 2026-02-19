'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { CourseFilters } from './use-courses';

export function useCourseFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: CourseFilters = useMemo(() => ({
    status: (searchParams.get('status') as CourseFilters['status']) || 'all',
    priority: (() => {
      const p = searchParams.get('priority');
      if (!p || p === 'all') return 'all' as const;
      return Number(p) as CourseFilters['priority'];
    })(),
    platform: (searchParams.get('platform') as CourseFilters['platform']) || 'all',
    search: searchParams.get('q') || undefined,
    sortBy: (searchParams.get('sort') as CourseFilters['sortBy']) || 'priority',
    sortDir: (searchParams.get('dir') as CourseFilters['sortDir']) || 'asc',
  }), [searchParams]);

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === 'all' || value === '') {
        params.delete(key === 'search' ? 'q' : key === 'sortBy' ? 'sort' : key === 'sortDir' ? 'dir' : key);
      } else {
        const paramKey = key === 'search' ? 'q' : key === 'sortBy' ? 'sort' : key === 'sortDir' ? 'dir' : key;
        params.set(paramKey, value);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActiveFilters = useMemo(() => {
    return !!(
      (filters.status && filters.status !== 'all') ||
      (filters.priority && filters.priority !== 'all') ||
      (filters.platform && filters.platform !== 'all') ||
      filters.search
    );
  }, [filters]);

  return {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
  };
}
