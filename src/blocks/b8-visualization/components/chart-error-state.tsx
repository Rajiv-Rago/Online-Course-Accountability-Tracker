'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChartErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ChartErrorState({
  message = 'Failed to load chart data',
  onRetry,
}: ChartErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-10 w-10 text-destructive mb-3" />
      <p className="text-sm font-medium mb-1">Failed to Load Chart</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
