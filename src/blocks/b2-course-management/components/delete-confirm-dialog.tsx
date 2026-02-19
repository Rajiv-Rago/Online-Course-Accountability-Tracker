'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Course } from '@/lib/types';
import { useCourseMutations } from '../hooks/use-course-mutations';
import { useRouter } from 'next/navigation';

interface DeleteConfirmDialogProps {
  course: Course;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectOnDelete?: boolean;
}

export function DeleteConfirmDialog({
  course,
  open,
  onOpenChange,
  redirectOnDelete = false,
}: DeleteConfirmDialogProps) {
  const mutations = useCourseMutations();
  const router = useRouter();

  const handleDelete = () => {
    mutations.deleteCourse.mutate(course.id, {
      onSuccess: () => {
        onOpenChange(false);
        if (redirectOnDelete) {
          router.push('/courses');
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Course</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this course? This action cannot be
            undone. All study sessions associated with this course will also be
            deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm">
          <p>
            <span className="text-muted-foreground">Course:</span>{' '}
            <span className="font-medium">{course.title}</span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={mutations.deleteCourse.isPending}
          >
            {mutations.deleteCourse.isPending ? 'Deleting...' : 'Delete Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
