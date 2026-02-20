'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '../hooks/use-unread-count';
import { NotificationDrawer } from './notification-drawer';

export function NotificationBell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { unreadCount } = useUnreadCount();

  return (
    <>
      <button
        type="button"
        className={cn(
          'relative flex items-center justify-center rounded-lg p-2',
          'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors'
        )}
        onClick={() => setDrawerOpen(true)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
