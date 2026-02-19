'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { calcDaysRemaining } from '../lib/course-utils';

interface DaysRemainingBadgeProps {
  targetDate: string | null;
  className?: string;
}

export function DaysRemainingBadge({ targetDate, className }: DaysRemainingBadgeProps) {
  const days = calcDaysRemaining(targetDate);

  if (days === null) {
    return (
      <span className={`text-xs text-muted-foreground ${className ?? ''}`}>
        No target set
      </span>
    );
  }

  if (days < 0) {
    return (
      <Badge variant="destructive" className={className}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        {Math.abs(days)} days overdue
      </Badge>
    );
  }

  if (days <= 7) {
    return (
      <Badge
        variant="outline"
        className={`bg-orange-100 text-orange-700 border-0 dark:bg-orange-950 dark:text-orange-300 ${className ?? ''}`}
      >
        <Clock className="h-3 w-3 mr-1" />
        {days} days left
      </Badge>
    );
  }

  return (
    <span className={`text-xs text-muted-foreground flex items-center gap-1 ${className ?? ''}`}>
      <Clock className="h-3 w-3" />
      {days} days left
    </span>
  );
}
