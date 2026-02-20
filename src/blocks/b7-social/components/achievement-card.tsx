'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import type { Achievement } from '@/lib/types';
import { ACHIEVEMENT_MAP } from '../lib/achievement-definitions';
import { ACHIEVEMENT_ICONS } from '../lib/achievement-icons';

interface AchievementCardProps {
  achievement: Achievement;
  onShareClick?: (id: string, currentShared: boolean) => void;
}

export function AchievementCard({ achievement, onShareClick }: AchievementCardProps) {
  const def = ACHIEVEMENT_MAP.get(achievement.achievement_type);
  const Icon = ACHIEVEMENT_ICONS[achievement.achievement_type];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{def?.name ?? achievement.achievement_type}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{def?.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Earned {new Date(achievement.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        {onShareClick && (
          <Button
            variant="ghost"
            size="sm"
            className={achievement.shared ? 'text-primary' : 'text-muted-foreground'}
            onClick={() => onShareClick(achievement.id, achievement.shared)}
            title={achievement.shared ? 'Shared with buddies' : 'Share with buddies'}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
