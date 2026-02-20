'use client';

import { Badge } from '@/components/ui/badge';
import type { RiskLevel } from '@/lib/types';

interface RiskLevelIndicatorProps {
  level: RiskLevel;
}

const levelConfig: Record<RiskLevel, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Low Risk', variant: 'secondary' },
  medium: { label: 'Medium Risk', variant: 'outline' },
  high: { label: 'High Risk', variant: 'default' },
  critical: { label: 'Critical Risk', variant: 'destructive' },
};

export function RiskLevelIndicator({ level }: RiskLevelIndicatorProps) {
  const config = levelConfig[level];
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
