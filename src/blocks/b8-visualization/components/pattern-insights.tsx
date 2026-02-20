'use client';

import { BarChart3 } from 'lucide-react';
import { PatternInsightCard } from './pattern-insight-card';
import { ChartLoadingSkeleton } from './chart-loading-skeleton';
import { usePatternInsights } from '../hooks/use-pattern-insights';
import type { DateRange } from '../lib/date-utils';

interface PatternInsightsProps {
  courseIds: string[];
  dateRange: DateRange;
}

export function PatternInsights({ courseIds, dateRange }: PatternInsightsProps) {
  const { data, isLoading, error } = usePatternInsights(courseIds, dateRange);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Pattern Insights</h3>
        <ChartLoadingSkeleton height={120} />
      </div>
    );
  }

  if (error || !data) return null;

  if (!data.hasSufficientData) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Pattern Insights</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg">
          <BarChart3 className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Need More Data</p>
          <p className="text-xs text-muted-foreground mt-1">
            At least 14 days of data and 10 sessions are needed to detect patterns.
          </p>
        </div>
      </div>
    );
  }

  if (data.insights.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Pattern Insights</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg">
          <BarChart3 className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No Strong Patterns Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Keep studying consistently and patterns will emerge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Pattern Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.insights.map((insight) => (
          <PatternInsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
