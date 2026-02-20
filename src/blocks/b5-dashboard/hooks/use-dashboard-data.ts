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

      // Extract buddy IDs, filtering out the current user
      const buddyIds: string[] = [];
      for (const buddy of raw.buddies) {
        const otherId =
          buddy.requester_id === raw.userId
            ? buddy.recipient_id
            : buddy.requester_id;
        if (!buddyIds.includes(otherId)) {
          buddyIds.push(otherId);
        }
      }

      // Fetch buddy activity (admin bypasses RLS, server verifies authorization)
      let buddyActivity: BuddyActivityData[] = [];
      if (buddyIds.length > 0) {
        const buddyResult = await getBuddyActivity(buddyIds);
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
