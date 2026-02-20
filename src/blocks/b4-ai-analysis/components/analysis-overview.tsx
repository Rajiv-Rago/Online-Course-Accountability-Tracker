'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLatestAnalyses } from '../hooks/use-analysis';
import { useRiskSummary } from '../hooks/use-risk-summary';
import { useWeeklyReport } from '../hooks/use-weekly-report';
import { AnalysisLoadingOverview } from './analysis-loading';
import { CourseAnalysisCard } from './course-analysis-card';
import { WeeklyReportCard } from './weekly-report-card';
import { RiskScoreBadge } from './risk-score-badge';
import { riskLevelFromScore } from '../lib/risk-calculator';

export function AnalysisOverview() {
  const { data: analyses, isLoading: analysesLoading, error: analysesError } = useLatestAnalyses();
  const { data: riskSummary, isLoading: riskLoading } = useRiskSummary();
  const { data: weeklyReport, isLoading: weeklyLoading } = useWeeklyReport();

  if (analysesLoading || riskLoading || weeklyLoading) {
    return <AnalysisLoadingOverview />;
  }

  if (analysesError) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">Failed to load analyses. Please try again.</p>
      </div>
    );
  }

  const hasAnalyses = analyses && analyses.length > 0;
  const hasReport = weeklyReport !== null && weeklyReport !== undefined;

  if (!hasAnalyses && !hasReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <h2 className="text-xl font-semibold mb-2">No AI Analysis Yet</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          AI analysis runs daily for your active courses. Start studying and insights will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk summary cards */}
      {riskSummary && riskSummary.totalCourses > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overall Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <RiskScoreBadge
                  score={riskSummary.averageRisk}
                  level={riskLevelFromScore(riskSummary.averageRisk)}
                  size="lg"
                />
                <div>
                  <p className="text-sm font-medium">
                    {riskSummary.totalCourses} active {riskSummary.totalCourses === 1 ? 'course' : 'courses'}
                  </p>
                  <p className="text-xs text-muted-foreground">Weighted by priority</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm">
                {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                  <div key={level} className="text-center">
                    <p className="font-medium">{riskSummary.riskDistribution[level]}</p>
                    <p className="text-xs text-muted-foreground capitalize">{level}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {riskSummary.highestRiskCourse && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Highest Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <RiskScoreBadge
                    score={riskSummary.highestRiskCourse.riskScore}
                    level={riskSummary.highestRiskCourse.riskLevel}
                    size="md"
                  />
                  <p className="text-sm font-medium truncate">
                    {riskSummary.highestRiskCourse.title}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Latest weekly report */}
      {hasReport && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Latest Weekly Report</h2>
          <WeeklyReportCard report={weeklyReport} />
        </div>
      )}

      {/* Per-course analyses */}
      {hasAnalyses && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Course Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analyses.map((analysis) => (
              <CourseAnalysisCard key={analysis.course_id} analysis={analysis} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
