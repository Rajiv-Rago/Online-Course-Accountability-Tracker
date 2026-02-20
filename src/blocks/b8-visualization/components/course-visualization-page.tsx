'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useChartRange } from '../hooks/use-chart-range';
import { useProgressTimeline } from '../hooks/use-progress-timeline';
import { useCompletionForecast } from '../hooks/use-completion-forecast';
import { useRiskTrend } from '../hooks/use-risk-trend';
import { useSessionDistribution } from '../hooks/use-session-distribution';
import { useChartCourseFilter } from '../hooks/use-chart-course-filter';

import { ChartRangeSelector } from './chart-range-selector';
import { ChartWrapper } from './chart-wrapper';
import { ChartLoadingSkeleton } from './chart-loading-skeleton';
import { EmptyChartState } from './empty-chart-state';

const ProgressLineChart = dynamic(
  () => import('./progress-line-chart').then((m) => ({ default: m.ProgressLineChart })),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

const CompletionForecastChart = dynamic(
  () => import('./completion-forecast').then((m) => ({ default: m.CompletionForecastChart })),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

const RiskTrendChart = dynamic(
  () => import('./risk-trend-chart').then((m) => ({ default: m.RiskTrendChart })),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

const SessionDistributionChart = dynamic(
  () => import('./session-distribution').then((m) => ({ default: m.SessionDistributionChart })),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

interface CourseVisualizationPageProps {
  courseId: string;
}

export function CourseVisualizationPage({ courseId }: CourseVisualizationPageProps) {
  const router = useRouter();
  const { dateRange } = useChartRange();
  const { courses } = useChartCourseFilter();

  const courseIds = [courseId];
  const progress = useProgressTimeline(courseIds, dateRange);
  const forecast = useCompletionForecast(courseId);
  const riskTrend = useRiskTrend(courseIds, dateRange);
  const distribution = useSessionDistribution(courseIds, dateRange);

  const courseInfo = courses.find((c) => c.id === courseId);
  const courseTitle = courseInfo?.title ?? forecast.courseTitle ?? 'Course';

  const progressCoursesWithTargets = progress.chartData.courses.map((c) => {
    const raw = progress.data?.courses.find((rc) => rc.id === c.id);
    return { ...c, targetDate: raw?.target_completion_date ?? null };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/visualizations')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{courseTitle}</h1>
          <p className="text-xs text-muted-foreground">Course Visualizations</p>
        </div>
      </div>

      <ChartRangeSelector />

      {/* Full-width progress chart */}
      <ChartWrapper
        title="Progress Over Time"
        isLoading={progress.isLoading}
        error={progress.error ?? undefined}
        isEmpty={progress.chartData.points.length === 0 && !progress.isLoading}
        onRetry={() => progress.refetch()}
      >
        <ProgressLineChart
          data={progress.chartData.points}
          courses={progressCoursesWithTargets}
        />
      </ChartWrapper>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartWrapper
          title="Completion Forecast"
          isLoading={forecast.isLoading}
          error={forecast.error ?? undefined}
          isEmpty={!forecast.forecast && !forecast.isLoading}
          onRetry={() => forecast.refetch()}
        >
          {forecast.forecast && (
            <CompletionForecastChart
              forecast={forecast.forecast}
              targetDate={forecast.targetDate}
            />
          )}
        </ChartWrapper>

        <ChartWrapper
          title="Risk Score Trend"
          isLoading={riskTrend.isLoading}
          error={riskTrend.error ?? undefined}
          isEmpty={riskTrend.chartData.points.length === 0 && !riskTrend.isLoading}
          onRetry={() => riskTrend.refetch()}
        >
          <RiskTrendChart
            data={riskTrend.chartData.points}
            courseColors={riskTrend.chartData.courseColors}
            courses={courses.filter((c) => c.id === courseId)}
          />
        </ChartWrapper>

        <ChartWrapper
          title="Session Distribution"
          isLoading={distribution.isLoading}
          error={distribution.error ?? undefined}
          isEmpty={distribution.chartData.buckets.length === 0 && !distribution.isLoading}
          onRetry={() => distribution.refetch()}
        >
          <SessionDistributionChart
            data={distribution.chartData.buckets}
            averageDuration={distribution.chartData.averageDuration}
          />
        </ChartWrapper>
      </div>
    </div>
  );
}
