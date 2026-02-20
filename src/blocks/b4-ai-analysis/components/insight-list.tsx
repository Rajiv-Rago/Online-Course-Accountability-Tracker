'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InsightCard } from './insight-card';
import type { AiInsight } from '@/lib/types';

interface InsightListProps {
  insights: AiInsight[];
  maxVisible?: number;
}

export function InsightList({ insights, maxVisible = 3 }: InsightListProps) {
  const [expanded, setExpanded] = useState(false);

  if (insights.length === 0) {
    return <p className="text-sm text-muted-foreground">No insights available.</p>;
  }

  const visible = expanded ? insights : insights.slice(0, maxVisible);
  const hasMore = insights.length > maxVisible;

  return (
    <div className="space-y-2">
      {visible.map((insight, i) => (
        <InsightCard key={`${insight.type}-${insight.title}-${i}`} insight={insight} />
      ))}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show ${insights.length - maxVisible} more`}
        </Button>
      )}
    </div>
  );
}
