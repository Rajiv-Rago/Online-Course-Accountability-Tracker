'use client';

import Link from 'next/link';
import { Clock, Trophy, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityItemData } from '../lib/dashboard-utils';

const iconMap = {
  Clock,
  Trophy,
  AlertTriangle,
} as const;

interface ActivityItemProps {
  item: ActivityItemData;
}

export function ActivityItem({ item }: ActivityItemProps) {
  const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Clock;

  const content = (
    <div className="flex items-start gap-3 py-2">
      <div className="relative mt-0.5">
        <div
          className={cn(
            'rounded-full p-1.5',
            item.type === 'achievement' && 'bg-yellow-500/10 text-yellow-600',
            item.type === 'session' && 'bg-primary/10 text-primary',
            item.type === 'analysis' && 'bg-red-500/10 text-red-600'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">{item.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.relativeTime}</p>
      </div>
    </div>
  );

  if (item.actionUrl) {
    return (
      <li>
        <Link
          href={item.actionUrl}
          className="block rounded-md px-2 -mx-2 hover:bg-muted/50 transition-colors"
        >
          {content}
        </Link>
      </li>
    );
  }

  return <li className="px-2 -mx-2">{content}</li>;
}
