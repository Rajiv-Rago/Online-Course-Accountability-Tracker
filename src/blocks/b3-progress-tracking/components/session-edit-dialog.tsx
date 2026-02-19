'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { StudySession } from '@/lib/types';

interface SessionEditDialogProps {
  session: StudySession & { course_title?: string };
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    durationMinutes?: number;
    modulesCompleted?: number;
    notes?: string | null;
  }) => void;
  isSaving?: boolean;
}

export function SessionEditDialog({
  session,
  open,
  onClose,
  onSave,
  isSaving,
}: SessionEditDialogProps) {
  const [duration, setDuration] = useState(session.duration_minutes);
  const [modules, setModules] = useState(session.modules_completed);
  const [notes, setNotes] = useState(session.notes ?? '');

  const handleSave = () => {
    onSave({
      durationMinutes: duration !== session.duration_minutes ? duration : undefined,
      modulesCompleted: modules !== session.modules_completed ? modules : undefined,
      notes: notes !== (session.notes ?? '') ? (notes || null) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Read-only info */}
          <div className="space-y-1">
            <Label className="text-muted-foreground">Course</Label>
            <p className="text-sm font-medium">
              {(session as { course_title?: string }).course_title ?? 'Unknown'}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground">Date</Label>
            <p className="text-sm font-medium">
              {format(new Date(session.started_at), 'PPP')}
            </p>
          </div>

          {/* Editable fields */}
          <div className="space-y-2">
            <Label htmlFor="edit-duration">Duration (minutes)</Label>
            <Input
              id="edit-duration"
              type="number"
              min={1}
              max={480}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-modules">Modules Completed</Label>
            <Input
              id="edit-modules"
              type="number"
              min={0}
              value={modules}
              onChange={(e) => setModules(Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
