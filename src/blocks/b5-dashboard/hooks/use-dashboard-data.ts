'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getDashboardData,
  getBuddyActivity,
  type DashboardRawData,
  type BuddyActivityData,
} from '../actions/dashboard-actions';

export interface DashboardQueryData extends DashboardRawData {
  buddyActivity: BuddyActivityData[];
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardQueryData> => {
      const result = await getDashboardData();
      if (result.error) throw new Error(result.error);
      const raw = result.data!;

      // Extract buddy IDs for current user
      const buddyIds = new Set<string>();
      for (const buddy of raw.buddies) {
        // We don't know the current user ID client-side, so include both sides
        // The server action already filters to only accepted buddies for this user
        buddyIds.add(buddy.requester_id);
        buddyIds.add(buddy.recipient_id);
      }

      // Fetch buddy activity (admin bypasses RLS)
      let buddyActivity: BuddyActivityData[] = [];
      if (buddyIds.size > 0) {
        const buddyResult = await getBuddyActivity(Array.from(buddyIds));
        if (buddyResult.data) {
          buddyActivity = buddyResult.data;
        }
      }

      return { ...raw, buddyActivity };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
