'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { ReminderWithCourse } from '../actions/reminder-actions';
import { formatDays, formatTime24to12 } from './notification-utils';

interface ReminderItemProps {
  reminder: ReminderWithCourse;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (reminder: ReminderWithCourse) => void;
  onDelete: (id: string) => void;
}

export function ReminderItem({
  reminder,
  onToggle,
  onEdit,
  onDelete,
}: ReminderItemProps) {
  const timeStr = formatTime24to12(reminder.time);
  const daysStr = formatDays(reminder.days_of_week);

  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <Switch
        checked={reminder.enabled}
        onCheckedChange={(checked) => onToggle(reminder.id, checked)}
        aria-label={`${reminder.enabled ? 'Disable' : 'Enable'} reminder for ${reminder.course_title ?? 'course'}`}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {reminder.course_title ?? 'General Reminder'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {daysStr} at {timeStr}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {reminder.channels.map((ch) => (
            <Badge key={ch} variant="secondary" className="px-1.5 py-0 text-[10px]">
              {ch.replace('_', '-')}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(reminder)}
          aria-label="Edit reminder"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(reminder.id)}
          aria-label="Delete reminder"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
