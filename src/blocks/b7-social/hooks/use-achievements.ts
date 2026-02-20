'use client';

import { useQuery } from '@tanstack/react-query';
import { getAchievements, type AchievementsData } from '../actions/achievement-actions';

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: async (): Promise<AchievementsData> => {
      const result = await getAchievements();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000,
  });
}
