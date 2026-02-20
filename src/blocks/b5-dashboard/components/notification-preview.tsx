'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import type { Notification } from '@/lib/types';
import { formatRelativeTime } from '../lib/dashboard-utils';

interface NotificationPreviewProps {
  notifications: Notification[];
}

export function NotificationPreview({ notifications }: NotificationPreviewProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const recent = notifications.slice(0, 3);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Notifications</p>
        </div>
        {recent.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {recent.map((n) => (
              <div key={n.id} className="p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <Link href="/notifications">See All</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
