'use client';

import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyChartStateProps {
  title?: string;
  message?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyChartState({
  title = 'No Study Data Yet',
  message = 'Start logging study sessions to see your progress visualized here.',
  ctaLabel,
  ctaHref,
}: EmptyChartStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">{message}</p>
      {ctaLabel && ctaHref && (
        <Button variant="outline" size="sm" asChild>
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}
