'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskScoreBadge } from './risk-score-badge';
import { RiskLevelIndicator } from './risk-level-indicator';
import { InsightList } from './insight-list';
import { InterventionCard } from './intervention-card';
import type { AnalysisWithCourse } from '../actions/analysis-actions';

interface CourseAnalysisCardProps {
  analysis: AnalysisWithCourse;
}

export function CourseAnalysisCard({ analysis }: CourseAnalysisCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href={`/analysis/${analysis.course_id}`}
              className="hover:underline underline-offset-4"
            >
              <CardTitle className="text-base truncate">{analysis.course_title}</CardTitle>
            </Link>
            {analysis.course_platform && (
              <p className="text-xs text-muted-foreground capitalize mt-0.5">
                {analysis.course_platform}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {analysis.risk_level && <RiskLevelIndicator level={analysis.risk_level} />}
            {analysis.risk_score !== null && analysis.risk_level && (
              <RiskScoreBadge score={analysis.risk_score} level={analysis.risk_level} size="sm" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {analysis.insights.length > 0 && (
          <InsightList insights={analysis.insights} maxVisible={2} />
        )}

        {analysis.interventions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recommended Actions
            </h4>
            {analysis.interventions.slice(0, 2).map((intervention, i) => (
              <InterventionCard key={i} intervention={intervention} />
            ))}
          </div>
        )}

        <div className="pt-1">
          <Link
            href={`/analysis/${analysis.course_id}`}
            className="text-xs text-primary hover:underline underline-offset-4"
          >
            View full analysis
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
