'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { AiInsight } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  insight: AiInsight;
}

const typeStyles: Record<AiInsight['type'], { icon: string; border: string }> = {
  positive: { icon: '+', border: 'border-l-green-500' },
  warning: { icon: '!', border: 'border-l-yellow-500' },
  suggestion: { icon: '?', border: 'border-l-blue-500' },
  neutral: { icon: '-', border: 'border-l-muted-foreground' },
};

export function InsightCard({ insight }: InsightCardProps) {
  const style = typeStyles[insight.type];

  return (
    <Card className={cn('border-l-4', style.border)}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
            {style.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium">{insight.title}</h4>
              <span className="shrink-0 text-xs text-muted-foreground">
                {Math.round(insight.confidence * 100)}%
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
