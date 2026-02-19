'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CourseProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function CourseProgressBar({
  value,
  className,
  showLabel = true,
  size = 'md',
}: CourseProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress
        value={clamped}
        className={cn(size === 'sm' ? 'h-2' : 'h-3', 'flex-1')}
      />
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground w-10 text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
