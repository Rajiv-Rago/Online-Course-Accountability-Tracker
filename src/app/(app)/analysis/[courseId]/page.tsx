'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAnalysisHistory } from '@/blocks/b4-ai-analysis/hooks/use-analysis';
import { AnalysisHistory } from '@/blocks/b4-ai-analysis/components/analysis-history';
import { PatternDisplay } from '@/blocks/b4-ai-analysis/components/pattern-display';
import { RiskScoreBadge } from '@/blocks/b4-ai-analysis/components/risk-score-badge';
import { RiskLevelIndicator } from '@/blocks/b4-ai-analysis/components/risk-level-indicator';
import { InsightList } from '@/blocks/b4-ai-analysis/components/insight-list';
import { InterventionCard } from '@/blocks/b4-ai-analysis/components/intervention-card';
import { AnalysisLoadingDetail } from '@/blocks/b4-ai-analysis/components/analysis-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CourseAnalysisPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const { data: analyses, isLoading, error } = useAnalysisHistory(courseId);

  if (isLoading) {
    return <AnalysisLoadingDetail />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">Failed to load analysis data.</p>
      </div>
    );
  }

  const latest = analyses?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Course Analysis</h1>
          <p className="text-muted-foreground">Detailed AI analysis and history</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/analysis">Back to overview</Link>
        </Button>
      </div>

      {!latest ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <h2 className="text-xl font-semibold mb-2">No Analysis Data</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            No AI analysis has been generated for this course yet. Analysis runs daily for active courses.
          </p>
        </div>
      ) : (
        <>
          {/* Latest analysis summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">
                {new Date(latest.created_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Risk score */}
              {latest.risk_score !== null && latest.risk_level && (
                <div className="flex items-center gap-4">
                  <RiskScoreBadge score={latest.risk_score} level={latest.risk_level} size="lg" />
                  <div>
                    <RiskLevelIndicator level={latest.risk_level} />
                    <p className="text-xs text-muted-foreground mt-1">Risk score: {latest.risk_score}/100</p>
                  </div>
                </div>
              )}

              {/* Patterns */}
              {latest.patterns && <PatternDisplay patterns={latest.patterns} />}

              {/* Insights */}
              {latest.insights.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Insights</h3>
                  <InsightList insights={latest.insights} maxVisible={5} />
                </div>
              )}

              {/* Interventions */}
              {latest.interventions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Recommended Actions</h3>
                  <div className="space-y-2">
                    {latest.interventions.map((intervention, i) => (
                      <InterventionCard key={`${intervention.type}-${i}`} intervention={intervention} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis history */}
          {analyses && analyses.length > 1 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Analysis History</h2>
              <AnalysisHistory analyses={analyses.slice(1)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
