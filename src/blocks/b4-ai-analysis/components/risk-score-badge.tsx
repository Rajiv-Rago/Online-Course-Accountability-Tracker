'use client';

import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types';

interface RiskScoreBadgeProps {
  score: number;
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
};

const levelColors: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800',
  high: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
  critical: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
};

export function RiskScoreBadge({ score, level, size = 'md' }: RiskScoreBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 font-bold',
        sizeClasses[size],
        levelColors[level],
      )}
      title={`Risk score: ${score}/100 (${level})`}
    >
      {score}
    </div>
  );
}
