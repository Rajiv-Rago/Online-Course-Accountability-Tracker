'use client';

import { useQuery } from '@tanstack/react-query';
import { getWeeklyLeaderboard } from '../actions/leaderboard-actions';
import type { LeaderboardEntry } from '@/lib/types';

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const result = await getWeeklyLeaderboard();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
