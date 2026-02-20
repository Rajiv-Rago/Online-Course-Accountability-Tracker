import { toast } from 'sonner';
import type { AchievementType } from '@/lib/types';
import { ACHIEVEMENT_MAP } from '../lib/achievement-definitions';

export function showAchievementToast(achievementType: AchievementType) {
  const def = ACHIEVEMENT_MAP.get(achievementType);
  if (!def) return;

  toast.success(`Achievement Unlocked: ${def.name}`, {
    description: def.description,
    duration: 5000,
  });
}
