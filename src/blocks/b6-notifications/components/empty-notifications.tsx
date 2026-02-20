'use client';

import { Bell } from 'lucide-react';

interface EmptyNotificationsProps {
  hasFiltersApplied: boolean;
}

export function EmptyNotifications({ hasFiltersApplied }: EmptyNotificationsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground">
        {hasFiltersApplied
          ? 'No notifications match your current filters'
          : "You're all caught up!"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasFiltersApplied
          ? 'Try adjusting or clearing your filters.'
          : 'No notifications yet.'}
      </p>
    </div>
  );
}
