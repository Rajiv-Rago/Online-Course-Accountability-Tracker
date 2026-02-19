'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calculateStreaks } from '../lib/streak-calculator';
import { fetchStreakData, applyStreakFreeze } from '../actions/stats-actions';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  freezeCount: number;
  lastStudyDate: string | null;
  isStudiedToday: boolean;
  dailyGoalMinutes: number;
}

export function useStreak() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['streak'],
    queryFn: async () => {
      const result = await fetchStreakData();
      if (result.error) throw new Error(result.error);

      const { dailyStats, freezeCount, dailyGoalMinutes } = result.data!;
      const today = new Date();
      const streakResult = calculateStreaks(dailyStats, today);

      return {
        currentStreak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak,
        freezeCount,
        lastStudyDate: streakResult.lastStudyDate,
        isStudiedToday: streakResult.isStudiedToday,
        dailyGoalMinutes,
      } as StreakData;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const freezeMutation = useMutation({
    mutationFn: (date: string) => applyStreakFreeze(date),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Streak freeze applied! ${result.data!.remainingFreezes} remaining`
        );
        queryClient.invalidateQueries({ queryKey: ['streak'] });
        queryClient.invalidateQueries({ queryKey: ['daily-stats'] });
      }
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    applyFreeze: freezeMutation,
  };
}
