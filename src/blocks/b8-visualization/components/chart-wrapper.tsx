'use client';

import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartLoadingSkeleton } from './chart-loading-skeleton';
import { ChartErrorState } from './chart-error-state';
import { EmptyChartState } from './empty-chart-state';
import { ExportChartButton } from './export-chart-button';

interface ChartWrapperProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  headerActions?: React.ReactNode;
  height?: number;
  filename?: string;
}

export function ChartWrapper({
  title,
  children,
  isLoading,
  error,
  isEmpty,
  onRetry,
  headerActions,
  height = 300,
  filename,
}: ChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-1">
          {headerActions}
          <ExportChartButton
            chartRef={chartRef}
            filename={filename ?? title.toLowerCase().replace(/\s+/g, '-')}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>
          {isLoading ? (
            <ChartLoadingSkeleton height={height} />
          ) : error ? (
            <ChartErrorState message={error.message} onRetry={onRetry} />
          ) : isEmpty ? (
            <EmptyChartState />
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
}
