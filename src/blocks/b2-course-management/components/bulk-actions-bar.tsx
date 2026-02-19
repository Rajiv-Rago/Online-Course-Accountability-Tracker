'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Trash2 } from 'lucide-react';
import { COURSE_STATUS, COURSE_PRIORITY } from '@/lib/types';
import type { CourseStatus, CoursePriority } from '@/lib/types';
import { formatStatus } from '../lib/course-utils';
import { getPriorityConfig } from '../lib/priority-config';
import { useCourseMutations } from '../hooks/use-course-mutations';

interface BulkActionsBarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection }: BulkActionsBarProps) {
  const mutations = useCourseMutations();
  const ids = Array.from(selectedIds);

  if (ids.length === 0) return null;

  const handleStatusChange = (status: string) => {
    mutations.bulkUpdateStatus.mutate(
      { ids, status: status as CourseStatus },
      { onSuccess: () => onClearSelection() }
    );
  };

  const handlePriorityChange = (priority: string) => {
    mutations.bulkUpdatePriority.mutate(
      { ids, priority: Number(priority) as CoursePriority },
      { onSuccess: () => onClearSelection() }
    );
  };

  const handleDelete = () => {
    if (confirm(`Delete ${ids.length} course${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) {
      mutations.bulkDelete.mutate(ids, {
        onSuccess: () => onClearSelection(),
      });
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
      <span className="text-sm font-medium">
        {ids.length} course{ids.length > 1 ? 's' : ''} selected
      </span>

      <Select onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[160px] h-8">
          <SelectValue placeholder="Change Status" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(COURSE_STATUS).map((s) => (
            <SelectItem key={s} value={s}>
              {formatStatus(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={handlePriorityChange}>
        <SelectTrigger className="w-[160px] h-8">
          <SelectValue placeholder="Change Priority" />
        </SelectTrigger>
        <SelectContent>
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

      <Button variant="destructive" size="sm" onClick={handleDelete}>
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>

      <Button variant="ghost" size="sm" onClick={onClearSelection} className="ml-auto">
        <X className="h-4 w-4 mr-1" />
        Clear
      </Button>
    </div>
  );
}
