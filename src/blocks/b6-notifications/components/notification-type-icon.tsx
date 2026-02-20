'use client';

import {
  Bell,
  AlertTriangle,
  Trophy,
  Users,
  BarChart3,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; colorClass: string }
> = {
  reminder: { icon: Bell, colorClass: 'text-blue-500' },
  risk_alert: { icon: AlertTriangle, colorClass: 'text-red-500' },
  achievement: { icon: Trophy, colorClass: 'text-yellow-500' },
  buddy_update: { icon: Users, colorClass: 'text-green-500' },
  weekly_report: { icon: BarChart3, colorClass: 'text-purple-500' },
  streak_warning: { icon: Flame, colorClass: 'text-orange-500' },
};

interface NotificationTypeIconProps {
  type: string;
  className?: string;
}

export function NotificationTypeIcon({ type, className }: NotificationTypeIconProps) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.reminder;
  const Icon = config.icon;

  return <Icon className={cn('h-5 w-5', config.colorClass, className)} />;
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    reminder: 'Reminders',
    risk_alert: 'Risk Alerts',
    achievement: 'Achievements',
    buddy_update: 'Buddy Updates',
    weekly_report: 'Weekly Reports',
    streak_warning: 'Streak Warnings',
  };
  return labels[type] ?? type;
}

export function getTypeBorderColor(type: string): string {
  const colors: Record<string, string> = {
    reminder: 'border-l-blue-500',
    risk_alert: 'border-l-red-500',
    achievement: 'border-l-yellow-500',
    buddy_update: 'border-l-green-500',
    weekly_report: 'border-l-purple-500',
    streak_warning: 'border-l-orange-500',
  };
  return colors[type] ?? 'border-l-muted-foreground';
}
