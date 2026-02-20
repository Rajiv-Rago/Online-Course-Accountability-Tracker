import type { UserProfile } from '@/lib/types';

/** Fields stripped from buddy profiles for privacy */
export const PRIVATE_FIELDS: (keyof UserProfile)[] = [
  'email',
  'slack_webhook_url',
  'discord_webhook_url',
  'notify_email',
  'notify_push',
  'notify_slack',
  'notify_discord',
  'notify_daily_reminder',
  'notify_streak_warning',
  'notify_weekly_report',
  'notify_achievement',
  'notify_risk_alert',
  'onboarding_completed',
  'onboarding_step',
];

/** Public-safe buddy activity data */
export interface PublicBuddyActivity {
  profile: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>;
  streak: number;
  hoursThisWeek: number;
  activeCoursesCount: number;
  lastActive: string | null;
  sharedAchievements: {
    achievement_type: string;
    earned_at: string;
    metadata: Record<string, unknown> | null;
  }[];
}

/**
 * Format a last-active timestamp into a relative string.
 */
export function formatLastActive(lastActive: string | null): string {
  if (!lastActive) return 'Never';

  const now = new Date();
  const then = new Date(lastActive);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
