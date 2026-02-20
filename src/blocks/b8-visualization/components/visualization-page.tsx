'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { useChartRange } from '../hooks/use-chart-range';
import { useChartCourseFilter } from '../hooks/use-chart-course-filter';
import { useHeatmapData } from '../hooks/use-heatmap-data';
import { useProgressTimeline } from '../hooks/use-progress-timeline';
import { useStudyHoursChart } from '../hooks/use-study-hours-chart';
import { useRiskTrend } from '../hooks/use-risk-trend';
import { useSessionDistribution } from '../hooks/use-session-distribution';

import { ChartRangeSelector } from './chart-range-selector';
import { ChartCourseFilter } from './chart-course-filter';
import { ChartPeriodToggle } from './chart-period-toggle';
import { ChartWrapper } from './chart-wrapper';
import { StudyHeatmap } from './study-heatmap';
import { ChartLoadingSkeleton } from './chart-loading-skeleton';
import { EmptyChartState } from './empty-chart-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Dynamic imports for Recharts components (ssr: false)
const StudyHoursBarChart = dynamic(
  () => import('./study-hours-bar-chart').then((m) => ({ default: m.StudyHoursBarChart })),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

const ProgressLineChart = dynamic(
  () => import('./progress-line-chart').then((m) => ({ default: m.ProgressLineChart })),
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

const PatternInsights = dynamic(
  () => import('./pattern-insights').then((m) => ({ default: m.PatternInsights })),
  { ssr: false, loading: () => <ChartLoadingSkeleton height={120} /> },
);

export function VisualizationPage() {
  const { dateRange } = useChartRange();
  const { selectedCourseIds, courses } = useChartCourseFilter();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const currentYear = new Date().getFullYear();
  const heatmap = useHeatmapData(currentYear);
  const progress = useProgressTimeline(selectedCourseIds, dateRange);
  const studyHours = useStudyHoursChart(selectedCourseIds, dateRange, period);
  const riskTrend = useRiskTrend(selectedCourseIds, dateRange);
  const distribution = useSessionDistribution(selectedCourseIds, dateRange);

  // Resolve course titles for hours chart
  const hoursCoursesWithTitles = studyHours.chartData.courses.map((c) => {
    const match = courses.find((fc) => fc.id === c.id);
    return match ? { ...c, title: match.title, color: match.color } : c;
  });

  const progressCoursesWithTargets = progress.chartData.courses.map((c) => {
    const raw = progress.data?.courses.find((rc) => rc.id === c.id);
    return { ...c, targetDate: raw?.target_completion_date ?? null };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights & Visualizations</h1>
        <p className="text-sm text-muted-foreground">
          Charts and patterns from your study data.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ChartCourseFilter />
        <ChartRangeSelector />
      </div>

      <Separator />

      {/* Heatmap */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Study Heatmap ({currentYear})
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href="/visualizations/heatmap">
              <Maximize2 className="h-3.5 w-3.5 mr-1" />
              Full Screen
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {heatmap.isLoading ? (
            <ChartLoadingSkeleton height={130} />
          ) : heatmap.error ? (
            <div className="text-sm text-destructive">Failed to load heatmap</div>
          ) : heatmap.data && heatmap.data.cells.length > 0 ? (
            <StudyHeatmap
              cells={heatmap.data.cells}
              totalWeeks={heatmap.data.totalWeeks}
              year={currentYear}
            />
          ) : (
            <EmptyChartState />
          )}
        </CardContent>
      </Card>

      {/* 2-column chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartWrapper
          title="Study Hours"
          isLoading={studyHours.isLoading}
          error={studyHours.error ?? undefined}
          isEmpty={studyHours.chartData.points.length === 0 && !studyHours.isLoading}
          onRetry={() => studyHours.refetch()}
          headerActions={<ChartPeriodToggle value={period} onChange={setPeriod} />}
        >
          <StudyHoursBarChart
            data={studyHours.chartData.points}
            courses={hoursCoursesWithTitles}
            goalLineHours={studyHours.chartData.goalLineHours}
          />
        </ChartWrapper>

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
            courses={courses}
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

      <Separator />

      {/* Pattern Insights */}
      <PatternInsights courseIds={selectedCourseIds} dateRange={dateRange} />
    </div>
  );
}
