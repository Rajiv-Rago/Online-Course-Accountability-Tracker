'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WeeklyReport } from '@/lib/types';

interface WeeklyReportCardProps {
  report: WeeklyReport;
}

export function WeeklyReportCard({ report }: WeeklyReportCardProps) {
  const trend = report.compared_to_previous?.trend;

  return (
    <Link href="/analysis/weekly">
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Week of {report.week_start}
            </CardTitle>
            {trend && (
              <Badge variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}>
                {trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Stable'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="font-medium">{Math.round(report.total_minutes / 60 * 10) / 10}h</p>
              <p className="text-xs text-muted-foreground">Study time</p>
            </div>
            <div>
              <p className="font-medium">{report.total_sessions}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
            <div>
              <p className="font-medium">{report.streak_length}d</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
          </div>
          {report.ai_summary && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
              {report.ai_summary}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
