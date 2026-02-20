'use client';

import { useQuery } from '@tanstack/react-query';
import { getBuddyActivity } from '../actions/buddy-actions';
import type { PublicBuddyActivity } from '../lib/buddy-privacy';

export function useBuddyActivity(buddyUserId: string) {
  return useQuery({
    queryKey: ['buddy-activity', buddyUserId],
    queryFn: async (): Promise<PublicBuddyActivity> => {
      const result = await getBuddyActivity(buddyUserId);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 5 * 60 * 1000,
  });
}
