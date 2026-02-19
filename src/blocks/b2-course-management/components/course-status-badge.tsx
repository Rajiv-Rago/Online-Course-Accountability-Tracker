'use client';

import { Badge } from '@/components/ui/badge';
import { formatStatus, getStatusColor } from '../lib/course-utils';
import type { CourseStatus } from '@/lib/types';

interface CourseStatusBadgeProps {
  status: CourseStatus;
  className?: string;
}

export function CourseStatusBadge({ status, className }: CourseStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${getStatusColor(status)} border-0 ${className ?? ''}`}
    >
      {formatStatus(status)}
    </Badge>
  );
}
