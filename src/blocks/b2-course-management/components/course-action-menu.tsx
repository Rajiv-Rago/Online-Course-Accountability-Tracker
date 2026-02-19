'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { Course, CourseStatus, CoursePriority } from '@/lib/types';
import { getAvailableTransitions, getTransitionLabel, requiresConfirmation } from '../lib/course-utils';
import { PRIORITIES } from '../lib/priority-config';
import { useCourseMutations } from '../hooks/use-course-mutations';
import { StatusTransitionDialog } from './status-transition-dialog';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import Link from 'next/link';

interface CourseActionMenuProps {
  course: Course;
}

export function CourseActionMenu({ course }: CourseActionMenuProps) {
  const [statusDialog, setStatusDialog] = useState<CourseStatus | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const mutations = useCourseMutations();

  const transitions = getAvailableTransitions(course.status);

  const handleTransition = (newStatus: CourseStatus) => {
    if (requiresConfirmation(course.status, newStatus)) {
      setStatusDialog(newStatus);
    } else {
      mutations.transitionStatus.mutate({
        courseId: course.id,
        newStatus,
      });
    }
  };

  const handlePriorityChange = (priority: CoursePriority) => {
    mutations.updatePriority.mutate({ id: course.id, priority });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/courses/${course.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Course
            </Link>
          </DropdownMenuItem>

          {transitions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {transitions.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleTransition(status)}
                >
                  {getTransitionLabel(course.status, status)}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change Priority</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(Object.entries(PRIORITIES) as [string, typeof PRIORITIES[CoursePriority]][]).map(
                ([key, config]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handlePriorityChange(Number(key) as CoursePriority)}
                    className={course.priority === Number(key) ? 'font-bold' : ''}
                  >
                    {config.shortLabel} - {config.label}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Course
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
      />
    </>
  );
}
