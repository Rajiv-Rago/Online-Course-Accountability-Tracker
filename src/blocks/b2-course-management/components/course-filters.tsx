'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { COURSE_STATUS, COURSE_PLATFORM, COURSE_PRIORITY } from '@/lib/types';
import { formatStatus } from '../lib/course-utils';
import { getPlatformConfig } from '../lib/platform-config';
import { getPriorityConfig } from '../lib/priority-config';
import { useCourseFilters } from '../hooks/use-course-filters';
import type { CoursePlatform, CoursePriority } from '@/lib/types';

export function CourseFilters() {
  const { filters, setFilter, clearFilters, hasActiveFilters } = useCourseFilters();

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="flex flex-wrap gap-2 flex-1">
        <Select
          value={String(filters.status || 'all')}
          onValueChange={(v) => setFilter('status', v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(COURSE_STATUS).map((s) => (
              <SelectItem key={s} value={s}>
                {formatStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(filters.priority || 'all')}
          onValueChange={(v) => setFilter('priority', v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {(Object.values(COURSE_PRIORITY) as CoursePriority[]).map((p) => {
              const config = getPriorityConfig(p);
              return (
                <SelectItem key={p} value={String(p)}>
                  {config.shortLabel} - {config.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select
          value={String(filters.platform || 'all')}
          onValueChange={(v) => setFilter('platform', v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {(Object.values(COURSE_PLATFORM) as CoursePlatform[]).map((p) => {
              const config = getPlatformConfig(p);
              return (
                <SelectItem key={p} value={p}>
                  {config.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search courses..."
          value={filters.search || ''}
          onChange={(e) => setFilter('search', e.target.value)}
          className="w-[200px]"
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
