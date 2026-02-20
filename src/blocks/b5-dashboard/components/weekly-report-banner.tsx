'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { WeeklyReport } from '@/lib/types';

interface WeeklyReportBannerProps {
  report: WeeklyReport | null;
}

export function WeeklyReportBanner({ report }: WeeklyReportBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!report) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Your first weekly report will be generated after a week of activity.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Weekly Report</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse weekly report' : 'Expand weekly report'}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!expanded ? (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {report.ai_summary ?? `${report.total_sessions} sessions, ${Math.round(report.total_minutes / 60)}h total`}
          </p>
        ) : (
          <div className="space-y-3">
            {report.ai_summary && (
              <p className="text-sm">{report.ai_summary}</p>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{report.total_sessions} sessions</span>
              <span>{Math.round(report.total_minutes / 60)}h studied</span>
              <span>{report.total_modules} modules</span>
            </div>
            {report.highlights && report.highlights.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Highlights</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {report.highlights.map((h, i) => (
                    <li key={i}>- {h}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.compared_to_previous && (
              <div className="text-xs text-muted-foreground">
                {report.compared_to_previous.trend === 'up'
                  ? `+${Math.abs(report.compared_to_previous.minutes_diff)}m vs previous week`
                  : report.compared_to_previous.trend === 'down'
                    ? `-${Math.abs(report.compared_to_previous.minutes_diff)}m vs previous week`
                    : 'Same as previous week'}
              </div>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">View Full Report</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
