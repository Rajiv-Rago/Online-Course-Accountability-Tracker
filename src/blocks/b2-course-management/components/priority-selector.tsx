'use client';

import { cn } from '@/lib/utils';
import { PRIORITIES } from '../lib/priority-config';
import type { CoursePriority } from '@/lib/types';

interface PrioritySelectorProps {
  value: CoursePriority;
  onChange: (priority: CoursePriority) => void;
}

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div className="flex gap-2">
      {(Object.entries(PRIORITIES) as [string, typeof PRIORITIES[CoursePriority]][]).map(
        ([key, config]) => {
          const priority = Number(key) as CoursePriority;
          const isSelected = value === priority;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(priority)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-md border-2 text-sm transition-colors',
                isSelected
                  ? `${config.bgColor} ${config.color} border-current font-semibold`
                  : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              <span className="font-semibold">{config.shortLabel}</span>
              <span className="text-xs">{config.label}</span>
            </button>
          );
        }
      )}
    </div>
  );
}
