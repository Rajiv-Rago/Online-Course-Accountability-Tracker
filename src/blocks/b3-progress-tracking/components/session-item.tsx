'use client';

import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StudySession } from '@/lib/types';

interface SessionItemProps {
  session: StudySession & {
    course_title: string;
    course_platform: string | null;
  };
  onEdit: (session: StudySession) => void;
  onDelete: (sessionId: string) => void;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

export function SessionItem({ session, onEdit, onDelete }: SessionItemProps) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      {/* Course name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {session.course_title}
          </span>
          <Badge variant="outline" className="text-xs shrink-0">
            {session.session_type}
          </Badge>
        </div>
        {session.notes && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {session.notes.length > 60
              ? session.notes.slice(0, 60) + '...'
              : session.notes}
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium">
          {formatDuration(session.duration_minutes)}
        </span>
      </div>

      {/* Modules */}
      {session.modules_completed > 0 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
          <BookOpen className="h-3.5 w-3.5" />
          <span>{session.modules_completed}</span>
        </div>
      )}

      {/* Date */}
      <span className="text-sm text-muted-foreground shrink-0 w-20 text-right">
        {formatSessionDate(session.started_at)}
      </span>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(session)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(session.id)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
