import { AnalysisOverview } from '@/blocks/b4-ai-analysis/components/analysis-overview';

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Analysis</h1>
        <p className="text-muted-foreground">
          AI-powered risk scoring, insights, and personalized interventions for your courses.
        </p>
      </div>
      <AnalysisOverview />
    </div>
  );
}
