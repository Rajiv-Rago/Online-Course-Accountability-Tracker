'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { Course, CourseStatus } from '@/lib/types';
import { formatStatus, getTransitionLabel, calcProgress } from '../lib/course-utils';
import { useCourseMutations } from '../hooks/use-course-mutations';

interface StatusTransitionDialogProps {
  course: Course;
  newStatus: CourseStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatusTransitionDialog({
  course,
  newStatus,
  open,
  onOpenChange,
}: StatusTransitionDialogProps) {
  const [reason, setReason] = useState('');
  const [overrideComplete, setOverrideComplete] = useState(false);
  const mutations = useCourseMutations();

  const progress = calcProgress(course.completed_modules, course.total_modules);
  const showOverride = newStatus === 'completed' && progress < 100;
  const label = getTransitionLabel(course.status, newStatus);

  const handleConfirm = () => {
    mutations.transitionStatus.mutate(
      {
        courseId: course.id,
        newStatus,
        reason: reason || undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Course Status</DialogTitle>
          <DialogDescription>
            Are you sure you want to {label.toLowerCase()}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Course:</span>{' '}
              {course.title}
            </p>
            <p>
              <span className="text-muted-foreground">Current Status:</span>{' '}
              {formatStatus(course.status)}
            </p>
            <p>
              <span className="text-muted-foreground">New Status:</span>{' '}
              {formatStatus(newStatus)}
            </p>
          </div>

          {newStatus === 'completed' && (
            <p className="text-sm text-muted-foreground">
              Current progress ({progress}%) will be recorded.
            </p>
          )}

          {newStatus === 'abandoned' && (
            <p className="text-sm text-muted-foreground">
              Current progress ({progress}%) will be preserved. You can restart
              this course later.
            </p>
          )}

          {showOverride && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="override"
                checked={overrideComplete}
                onCheckedChange={(checked) =>
                  setOverrideComplete(checked === true)
                }
              />
              <Label htmlFor="override" className="text-sm">
                Mark as complete even though progress is below 100%
              </Label>
            </div>
          )}

          {newStatus === 'abandoned' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you abandoning this course?"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              mutations.transitionStatus.isPending ||
              (showOverride && !overrideComplete)
            }
            variant={newStatus === 'abandoned' ? 'destructive' : 'default'}
          >
            {mutations.transitionStatus.isPending
              ? 'Updating...'
              : `Confirm ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
