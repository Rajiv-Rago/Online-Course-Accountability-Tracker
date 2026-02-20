'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  className?: string;
}

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-green-500', label: 'Up' },
  down: { icon: TrendingDown, color: 'text-red-500', label: 'Down' },
  stable: { icon: Minus, color: 'text-muted-foreground', label: 'Stable' },
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  className,
}: StatCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          </div>
          {trendInfo && TrendIcon && (
            <div className={cn('flex items-center gap-1 text-xs', trendInfo.color)}>
              <TrendIcon className="h-3 w-3" />
              <span>{trendLabel ?? trendInfo.label}</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
