'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkAchievements } from '../actions/achievement-actions';
import { ACHIEVEMENT_MAP } from '../lib/achievement-definitions';
import { toast } from 'sonner';
import type { AchievementTrigger } from '../lib/buddy-validation';

export function useAchievementCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trigger: AchievementTrigger) => checkAchievements(trigger),
    onSuccess: (result) => {
      if (result.error) return;
      const earned = result.data ?? [];
      for (const achievement of earned) {
        const def = ACHIEVEMENT_MAP.get(achievement.achievement_type);
        if (def) {
          toast.success(`Achievement Unlocked: ${def.name}`, {
            description: def.description,
          });
        }
      }
      if (earned.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['achievements'] });
      }
    },
  });
}
