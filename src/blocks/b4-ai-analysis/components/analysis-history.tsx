'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RiskScoreBadge } from './risk-score-badge';
import { InsightList } from './insight-list';
import { InterventionCard } from './intervention-card';
import { PatternDisplay } from './pattern-display';
import type { AiAnalysis } from '@/lib/types';

interface AnalysisHistoryProps {
  analyses: AiAnalysis[];
}

function HistoryEntry({ analysis }: { analysis: AiAnalysis }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(analysis.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-3 bottom-0 w-px bg-border last:hidden" />
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-background bg-muted" />

      <div className="space-y-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 w-full text-left"
        >
          <span className="text-sm text-muted-foreground">{date}</span>
          {analysis.risk_score !== null && analysis.risk_level && (
            <RiskScoreBadge score={analysis.risk_score} level={analysis.risk_level} size="sm" />
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {expanded ? 'Collapse' : 'Expand'}
          </span>
        </button>

        {expanded && (
          <Card>
            <CardContent className="pt-4 space-y-4">
              {analysis.insights.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Insights
                  </h4>
                  <InsightList insights={analysis.insights} maxVisible={5} />
                </div>
              )}

              {analysis.interventions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Interventions
                  </h4>
                  <div className="space-y-2">
                    {analysis.interventions.map((intervention, i) => (
                      <InterventionCard key={i} intervention={intervention} />
                    ))}
                  </div>
                </div>
              )}

              {analysis.patterns && <PatternDisplay patterns={analysis.patterns} />}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export function AnalysisHistory({ analyses }: AnalysisHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 10;

  if (analyses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No analysis history yet. Analysis runs daily for active courses.
      </p>
    );
  }

  const visible = showAll ? analyses : analyses.slice(0, maxVisible);

  return (
    <div>
      <div className="space-y-0">
        {visible.map((analysis) => (
          <HistoryEntry key={analysis.id} analysis={analysis} />
        ))}
      </div>
      {analyses.length > maxVisible && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show ${analyses.length - maxVisible} more entries`}
        </Button>
      )}
    </div>
  );
}
