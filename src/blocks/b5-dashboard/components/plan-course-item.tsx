'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play } from 'lucide-react';
import type { PlanCourseItemData } from '../lib/dashboard-utils';

interface PlanCourseItemProps {
  item: PlanCourseItemData;
}

const priorityLabels: Record<number, string> = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
};

const priorityVariants: Record<number, 'default' | 'secondary' | 'outline'> = {
  1: 'default',
  2: 'secondary',
  3: 'outline',
  4: 'outline',
};

export function PlanCourseItem({ item }: PlanCourseItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Badge variant={priorityVariants[item.priority] ?? 'outline'} className="shrink-0">
        {priorityLabels[item.priority] ?? `P${item.priority}`}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={item.currentProgress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">
            {item.suggestedMinutes}m
          </span>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0" asChild>
        <Link href={`/progress/timer?course=${item.courseId}`}>
          <Play className="h-4 w-4" />
          <span className="sr-only">Start studying {item.title}</span>
        </Link>
      </Button>
    </div>
  );
}
