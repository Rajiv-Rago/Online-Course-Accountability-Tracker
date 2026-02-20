'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWeeklyReport, useWeeklyReportDates } from '../hooks/use-weekly-report';
import { AnalysisLoadingDetail } from './analysis-loading';

export function WeeklyReportView() {
  const [selectedWeek, setSelectedWeek] = useState<string | undefined>();
  const { data: dates, isLoading: datesLoading } = useWeeklyReportDates();
  const { data: report, isLoading: reportLoading } = useWeeklyReport(selectedWeek);

  if (datesLoading || reportLoading) {
    return <AnalysisLoadingDetail />;
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <h2 className="text-xl font-semibold mb-2">No Weekly Reports Yet</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Weekly reports are generated automatically every Monday. Keep studying and your first report will appear here.
        </p>
      </div>
    );
  }

  const trend = report.compared_to_previous?.trend;

  return (
    <div className="space-y-6">
      {/* Week navigation */}
      {dates && dates.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {dates.map((date) => (
            <Button
              key={date}
              variant={date === (selectedWeek ?? dates[0]) ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedWeek(date)}
            >
              {date}
            </Button>
          ))}
        </div>
      )}

      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{Math.round(report.total_minutes / 60 * 10) / 10}h</p>
            <p className="text-xs text-muted-foreground">Total study time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{report.total_sessions}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{report.total_modules}</p>
            <p className="text-xs text-muted-foreground">Modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold">{report.streak_length}d</p>
              {trend && (
                <Badge variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}>
                  {trend === 'up' ? 'Up' : trend === 'down' ? 'Down' : 'Stable'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison */}
      {report.compared_to_previous && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">vs Previous Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Study time: </span>
                <span className={report.compared_to_previous.minutes_diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {report.compared_to_previous.minutes_diff >= 0 ? '+' : ''}
                  {Math.round(report.compared_to_previous.minutes_diff)} min
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Sessions: </span>
                <span className={report.compared_to_previous.sessions_diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {report.compared_to_previous.sessions_diff >= 0 ? '+' : ''}
                  {report.compared_to_previous.sessions_diff}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      {report.ai_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{report.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Courses breakdown */}
      {report.courses_summary && report.courses_summary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Courses Studied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.courses_summary.map((course) => (
                <div key={course.course_id} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{course.title}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {Math.round(course.minutes / 60 * 10) / 10}h / {course.sessions} sessions / {course.modules} modules
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highlights */}
      {report.highlights && report.highlights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {report.highlights.map((h, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-0.5">*</span>
                  {h}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0 text-xs mt-0.5">
                    {rec.type}
                  </Badge>
                  <span>{rec.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
