'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { NotificationTypeIcon, getTypeLabel } from './notification-type-icon';

const NOTIFICATION_TYPES = [
  'reminder',
  'risk_alert',
  'achievement',
  'buddy_update',
  'weekly_report',
  'streak_warning',
] as const;

interface NotificationFiltersProps {
  currentType: string | null;
  showUnreadOnly: boolean;
  onTypeChange: (type: string | null) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
}

export function NotificationFilters({
  currentType,
  showUnreadOnly,
  onTypeChange,
  onUnreadOnlyChange,
}: NotificationFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Select
        value={currentType ?? 'all'}
        onValueChange={(value) => onTypeChange(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {NOTIFICATION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              <div className="flex items-center gap-2">
                <NotificationTypeIcon type={type} className="h-4 w-4" />
                <span>{getTypeLabel(type)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Switch
          id="unread-only"
          checked={showUnreadOnly}
          onCheckedChange={onUnreadOnlyChange}
        />
        <Label htmlFor="unread-only" className="text-sm">
          Unread Only
        </Label>
      </div>
    </div>
  );
}
