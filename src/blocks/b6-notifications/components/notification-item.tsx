'use client';

import { useRouter } from 'next/navigation';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { NotificationTypeIcon, getTypeBorderColor } from './notification-type-icon';
import { formatRelativeTime } from './notification-utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const router = useRouter();

  const handleClick = () => {
    if (notification.action_url) {
      if (!notification.read) {
        onMarkAsRead(notification.id);
      }
      router.push(notification.action_url);
    }
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-4 transition-colors',
        !notification.read && [
          'border-l-[3px]',
          getTypeBorderColor(notification.type),
          'bg-background',
        ],
        notification.read && 'border-l-[3px] border-l-transparent bg-muted/30',
        notification.action_url && 'cursor-pointer hover:bg-accent/50'
      )}
      onClick={handleClick}
      role="listitem"
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <NotificationTypeIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {!notification.read && (
            <div
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-sm truncate',
                !notification.read ? 'font-semibold' : 'font-normal text-muted-foreground'
              )}
            >
              {notification.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {notification.message}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {formatRelativeTime(notification.created_at)}
              </span>
              {notification.channels_sent && notification.channels_sent.length > 0 && (
                <div className="flex gap-1">
                  {notification.channels_sent.map((ch) => (
                    <Badge key={ch} variant="outline" className="px-1 py-0 text-[9px]">
                      {ch.replace('_', '-')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            aria-label="Mark notification as read"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          aria-label="Delete notification"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
