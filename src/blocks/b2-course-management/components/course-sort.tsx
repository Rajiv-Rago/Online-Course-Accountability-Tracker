'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { useCourseFilters } from '../hooks/use-course-filters';

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'progress', label: 'Progress' },
  { value: 'name', label: 'Name' },
  { value: 'target_date', label: 'Target Date' },
  { value: 'created_at', label: 'Date Added' },
  { value: 'updated_at', label: 'Last Updated' },
];

export function CourseSort() {
  const { filters, setFilter } = useCourseFilters();

  const toggleDirection = () => {
    setFilter('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
      <Select
        value={filters.sortBy || 'priority'}
        onValueChange={(v) => setFilter('sortBy', v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDirection}
        className="h-9 w-9"
        title={filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
      >
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
