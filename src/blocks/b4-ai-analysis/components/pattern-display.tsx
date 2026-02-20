'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AiPatterns } from '@/lib/types';

interface PatternDisplayProps {
  patterns: AiPatterns;
}

export function PatternDisplay({ patterns }: PatternDisplayProps) {
  const entries: { label: string; value: string }[] = [];

  if (patterns.optimal_time) {
    entries.push({ label: 'Best study time', value: patterns.optimal_time });
  }

  entries.push({
    label: 'Avg session length',
    value: `${Math.round(patterns.avg_session_length)} min`,
  });

  entries.push({
    label: 'Consistency',
    value: `${Math.round(patterns.consistency_score * 100)}%`,
  });

  if (patterns.preferred_day) {
    entries.push({ label: 'Preferred day', value: patterns.preferred_day });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Study Patterns</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {entries.map((entry) => (
            <div key={entry.label}>
              <dt className="text-xs text-muted-foreground">{entry.label}</dt>
              <dd className="text-sm font-medium">{entry.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
