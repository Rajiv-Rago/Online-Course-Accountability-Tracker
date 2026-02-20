'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PatternInsight } from '../lib/pattern-detector';

interface PatternInsightCardProps {
  insight: PatternInsight;
}

const CATEGORY_COLORS: Record<string, string> = {
  timing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  duration: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  consistency: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  productivity: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

function MiniBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-1 h-12 mt-2">
      {values.map((value, i) => (
        <div key={labels[i]} className="flex flex-col items-center flex-1 gap-0.5">
          <div
            className="w-full bg-primary/20 rounded-sm min-h-[2px]"
            style={{ height: `${(value / max) * 100}%` }}
          />
          <span className="text-[9px] text-muted-foreground truncate w-full text-center">
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const height = 48;
  const width = values.length * 20;

  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary"
        />
      </svg>
      <div className="flex justify-between">
        <span className="text-[9px] text-muted-foreground">{labels[0]}</span>
        <span className="text-[9px] text-muted-foreground">{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

export function PatternInsightCard({ insight }: PatternInsightCardProps) {
  const categoryClass = CATEGORY_COLORS[insight.category] ?? CATEGORY_COLORS.timing;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-1">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${categoryClass}`}>
            {insight.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {Math.round(insight.confidence * 100)}% confidence
          </span>
        </div>
        <p className="text-sm font-medium mt-2">{insight.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
        {insight.supportingData.chartType === 'bar' ? (
          <MiniBarChart
            labels={insight.supportingData.labels}
            values={insight.supportingData.values}
          />
        ) : (
          <MiniLineChart
            labels={insight.supportingData.labels}
            values={insight.supportingData.values}
          />
        )}
      </CardContent>
    </Card>
  );
}
