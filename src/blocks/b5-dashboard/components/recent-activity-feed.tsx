'use client';

import { ActivityItem } from './activity-item';
import type { ActivityItemData } from '../lib/dashboard-utils';

interface RecentActivityFeedProps {
  items: ActivityItemData[];
}

export function RecentActivityFeed({ items }: RecentActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          No recent activity. Start a study session to see your progress here!
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Recent Activity</h2>
      <ol role="feed" className="space-y-0.5">
        {items.map((item) => (
          <ActivityItem key={item.id} item={item} />
        ))}
      </ol>
    </div>
  );
}
