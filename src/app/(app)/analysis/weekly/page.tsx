import { WeeklyReportView } from '@/blocks/b4-ai-analysis/components/weekly-report-view';

export default function WeeklyReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Weekly Report</h1>
        <p className="text-muted-foreground">
          AI-generated weekly study summary with highlights and recommendations.
        </p>
      </div>
      <WeeklyReportView />
    </div>
  );
}
