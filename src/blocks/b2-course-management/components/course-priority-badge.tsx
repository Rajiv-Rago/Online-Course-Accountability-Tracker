'use client';

import { Badge } from '@/components/ui/badge';
import { getPriorityConfig } from '../lib/priority-config';
import type { CoursePriority } from '@/lib/types';

interface CoursePriorityBadgeProps {
  priority: CoursePriority;
  className?: string;
}

export function CoursePriorityBadge({ priority, className }: CoursePriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.color} border-0 ${className ?? ''}`}
    >
      {config.shortLabel}
    </Badge>
  );
}
