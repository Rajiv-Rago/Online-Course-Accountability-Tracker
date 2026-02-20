'use client';

import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications, useNotificationMutations } from '../hooks/use-notifications';
import { NotificationTypeIcon } from './notification-type-icon';
import { formatRelativeTime } from './notification-utils';
import { cn } from '@/lib/utils';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { data, isLoading } = useNotifications({ pageSize: 5 });
  const { markAsRead, markAllAsRead } = useNotificationMutations();

  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-sm p-0" aria-label="Recent notifications">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/notifications" onClick={onClose}>
                See All
              </Link>
            </Button>
          </div>
        </SheetHeader>

        <Separator className="mt-3" />

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.action_url ?? '/notifications'}
                  className={cn(
                    'flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors',
                    !n.read && 'bg-primary/5'
                  )}
                  onClick={() => {
                    if (!n.read) markAsRead.mutate(n.id);
                    onClose();
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    <NotificationTypeIcon type={n.type} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm truncate',
                        !n.read ? 'font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                Mark All as Read
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
