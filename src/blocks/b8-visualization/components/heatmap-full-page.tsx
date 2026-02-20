'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useHeatmapData } from '../hooks/use-heatmap-data';
import { getSessionsForDay } from '../actions/visualization-actions';
import { StudyHeatmap } from './study-heatmap';
import { ChartLoadingSkeleton } from './chart-loading-skeleton';
import { ChartErrorState } from './chart-error-state';
import { EmptyChartState } from './empty-chart-state';
import { formatDateFull } from '../lib/date-utils';
import type { HeatmapCell } from '../lib/heatmap-utils';
import type { DaySessionRow } from '../actions/visualization-actions';

export function HeatmapFullPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();
  const yearParam = searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const { data, isLoading, error, refetch } = useHeatmapData(year);

  const [selectedDay, setSelectedDay] = useState<{
    cell: HeatmapCell;
    sessions: DaySessionRow[];
    loading: boolean;
  } | null>(null);

  const handleYearChange = (delta: number) => {
    const newYear = year + delta;
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(newYear));
    router.push(`/visualizations/heatmap?${params.toString()}`, { scroll: false });
  };

  const handleDayClick = async (cell: HeatmapCell) => {
    setSelectedDay({ cell, sessions: [], loading: true });
    const result = await getSessionsForDay({ date: cell.date });
    setSelectedDay({
      cell,
      sessions: result.data ?? [],
      loading: false,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/visualizations')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Visualizations
        </Button>
        <h1 className="text-lg font-semibold">Study Heatmap</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleYearChange(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleYearChange(1)}
            disabled={year >= currentYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ChartLoadingSkeleton height={160} />
      ) : error ? (
        <ChartErrorState message={error.message} onRetry={() => refetch()} />
      ) : !data || data.cells.length === 0 ? (
        <EmptyChartState
          title="No Data for This Year"
          message="Start logging study sessions to see your heatmap."
          ctaLabel="Log a Session"
          ctaHref="/progress"
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <StudyHeatmap
                cells={data.cells}
                totalWeeks={data.totalWeeks}
                year={year}
                onDayClick={handleDayClick}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Total Hours" value={`${data.summary.totalHours}h`} />
            <StatCard label="Total Sessions" value={String(data.summary.totalSessions)} />
            <StatCard label="Active Days" value={String(data.summary.totalActiveDays)} />
            <StatCard label="Longest Streak" value={`${data.summary.longestStreak} days`} />
            <StatCard label="Most Active Day" value={data.summary.mostActiveDay} />
          </div>

          {selectedDay && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">
                  {formatDateFull(selectedDay.cell.date)}
                </h3>
                {selectedDay.loading ? (
                  <p className="text-xs text-muted-foreground">Loading sessions...</p>
                ) : selectedDay.sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No sessions on this day.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedDay.sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-medium">{s.course_title}</span>
                        <span className="text-muted-foreground">{s.duration_minutes} min</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-lg font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
