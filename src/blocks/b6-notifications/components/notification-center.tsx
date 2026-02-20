'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications, useNotificationMutations } from '../hooks/use-notifications';
import { useUnreadCount } from '../hooks/use-unread-count';
import { NotificationItem } from './notification-item';
import { NotificationFilters } from './notification-filters';
import { EmptyNotifications } from './empty-notifications';
import { ReminderList } from './reminder-list';

export function NotificationCenter() {
  const [type, setType] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useNotifications({ type, unreadOnly, pageSize: 20 });

  const { markAsRead, markAllAsRead, deleteNotification } =
    useNotificationMutations();
  const { unreadCount } = useUnreadCount();

  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];
  const hasFilters = type !== null || unreadOnly;

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '200px',
    });
    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [handleObserver]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                {unreadCount} unread
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending || unreadCount === 0}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark All Read
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4">
          <NotificationFilters
            currentType={type}
            showUnreadOnly={unreadOnly}
            onTypeChange={setType}
            onUnreadOnlyChange={setUnreadOnly}
          />
        </div>
      </div>

      {/* Notification list */}
      <div className="rounded-lg border">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyNotifications hasFiltersApplied={hasFilters} />
        ) : (
          <div className="divide-y" role="list">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkAsRead={(id) => markAsRead.mutate(id)}
                onDelete={(id) => deleteNotification.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Reminders section */}
      <Separator />
      <ReminderList />
    </div>
  );
}
