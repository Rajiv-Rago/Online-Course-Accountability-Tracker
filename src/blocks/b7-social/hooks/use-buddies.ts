'use client';

import { useQuery } from '@tanstack/react-query';
import { getBuddies, type BuddiesData } from '../actions/buddy-actions';

export function useBuddies() {
  return useQuery({
    queryKey: ['buddies'],
    queryFn: async (): Promise<BuddiesData> => {
      const result = await getBuddies();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
