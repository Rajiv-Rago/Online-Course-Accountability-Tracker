'use client';

import { Progress } from '@/components/ui/progress';

interface AchievementProgressBarProps {
  current: number;
  target: number;
  label?: string;
}

export function AchievementProgressBar({ current, target, label }: AchievementProgressBarProps) {
  const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label ?? 'Progress'}</span>
        <span>{current} / {target}</span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}
