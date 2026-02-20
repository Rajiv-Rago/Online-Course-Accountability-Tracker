'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { LockedAchievement } from '@/lib/types';
import { ACHIEVEMENT_ICONS } from '../lib/achievement-icons';
import { AchievementProgressBar } from './achievement-progress-bar';
import type { AchievementType } from '@/lib/types';

interface AchievementLockedCardProps {
  achievement: LockedAchievement;
}

export function AchievementLockedCard({ achievement }: AchievementLockedCardProps) {
  const Icon = ACHIEVEMENT_ICONS[achievement.achievement_type as AchievementType];

  return (
    <Card className="opacity-60">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-full bg-muted p-2.5 shrink-0">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{achievement.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
          {achievement.target > 1 && (
            <div className="mt-2">
              <AchievementProgressBar
                current={achievement.current}
                target={achievement.target}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
