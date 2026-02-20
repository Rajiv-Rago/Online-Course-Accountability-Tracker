'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AiIntervention } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InterventionCardProps {
  intervention: AiIntervention;
}

const priorityDot: Record<AiIntervention['priority'], string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

export function InterventionCard({ intervention }: InterventionCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <span
            className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', priorityDot[intervention.priority])}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {intervention.type}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">
                {intervention.priority} priority
              </span>
            </div>
            <p className="text-sm">{intervention.message}</p>
            {intervention.action_url && intervention.action_url.startsWith('http') && (
              <a
                href={intervention.action_url}
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-primary underline-offset-4 hover:underline"
              >
                Take action
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
