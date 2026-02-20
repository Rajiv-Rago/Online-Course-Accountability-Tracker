'use client';

import { Badge } from '@/components/ui/badge';
import type { RiskLevel } from '@/lib/types';

interface RiskLevelIndicatorProps {
  level: RiskLevel;
}

const levelConfig: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: 'Low Risk', className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400' },
  medium: { label: 'Medium Risk', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400' },
  high: { label: 'High Risk', className: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400' },
  critical: { label: 'Critical Risk', className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400' },
};

export function RiskLevelIndicator({ level }: RiskLevelIndicatorProps) {
  const config = levelConfig[level];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
