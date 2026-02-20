import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from './channel-adapters/email-adapter';
import { sendSlack } from './channel-adapters/slack-adapter';
import { sendDiscord } from './channel-adapters/discord-adapter';
import type { NotificationChannel } from '@/lib/types/enums';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  channels_sent: string[];
}

interface UserPrefs {
  email: string;
  timezone: string;
  notify_email: boolean;
  notify_push: boolean;
  notify_slack: boolean;
  notify_discord: boolean;
  notify_daily_reminder: boolean;
  notify_streak_warning: boolean;
  notify_weekly_report: boolean;
  notify_achievement: boolean;
  notify_risk_alert: boolean;
  slack_webhook_url: string | null;
  discord_webhook_url: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
}

// Default channel preferences per notification type
const DEFAULT_CHANNELS: Record<string, NotificationChannel[]> = {
  reminder: ['in_app', 'push'],
  risk_alert: ['in_app', 'email', 'push'],
  achievement: ['in_app'],
  buddy_update: ['in_app'],
  weekly_report: ['in_app', 'email'],
  streak_warning: ['in_app', 'push'],
};

export async function sendToChannels(
  notification: NotificationRow
): Promise<{ channelsSent: string[]; errors: string[] }> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  const channelsSent: string[] = ['in_app'];

  // 1. Fetch user preferences
  const { data: prefs } = await supabase
    .from('user_profiles')
    .select(
      'email, timezone, notify_email, notify_push, notify_slack, notify_discord, notify_daily_reminder, notify_streak_warning, notify_weekly_report, notify_achievement, notify_risk_alert, slack_webhook_url, discord_webhook_url, preferred_time_start, preferred_time_end'
    )
    .eq('id', notification.user_id)
    .single();

  if (!prefs) return { channelsSent, errors: ['User preferences not found'] };
  const userPrefs = prefs as unknown as UserPrefs;

  // 2. Check if notification type is enabled
  if (!isTypeEnabled(notification.type, userPrefs)) {
    return { channelsSent, errors };
  }

  // 3. Determine which channels to use
  const defaultChannels = DEFAULT_CHANNELS[notification.type] ?? ['in_app'];

  // Email
  if (
    defaultChannels.includes('email') &&
    userPrefs.notify_email &&
    userPrefs.email
  ) {
    const result = await sendEmail({
      to: userPrefs.email,
      subject: notification.title,
      body: notification.message,
      notificationType: notification.type,
      actionUrl: notification.action_url ?? undefined,
    });
    if (result.success) {
      channelsSent.push('email');
    } else {
      errors.push(`email: ${result.error}`);
    }
  }

  // Slack
  if (
    userPrefs.notify_slack &&
    userPrefs.slack_webhook_url
  ) {
    const result = await sendSlack({
      webhookUrl: userPrefs.slack_webhook_url,
      title: notification.title,
      message: notification.message,
      notificationType: notification.type,
      actionUrl: notification.action_url ?? undefined,
    });
    if (result.success) {
      channelsSent.push('slack');
    } else {
      errors.push(`slack: ${result.error}`);
    }
  }

  // Discord
  if (
    userPrefs.notify_discord &&
    userPrefs.discord_webhook_url
  ) {
    const result = await sendDiscord({
      webhookUrl: userPrefs.discord_webhook_url,
      title: notification.title,
      message: notification.message,
      notificationType: notification.type,
      actionUrl: notification.action_url ?? undefined,
    });
    if (result.success) {
      channelsSent.push('discord');
    } else {
      errors.push(`discord: ${result.error}`);
    }
  }

  // 4. Update the notification record with final channels_sent
  await supabase
    .from('notifications')
    .update({ channels_sent: channelsSent })
    .eq('id', notification.id);

  return { channelsSent, errors };
}

function isTypeEnabled(type: string, prefs: UserPrefs): boolean {
  switch (type) {
    case 'reminder':
      return prefs.notify_daily_reminder;
    case 'risk_alert':
      return prefs.notify_risk_alert;
    case 'achievement':
      return prefs.notify_achievement;
    case 'weekly_report':
      return prefs.notify_weekly_report;
    case 'streak_warning':
      return prefs.notify_streak_warning;
    default:
      return true;
  }
}
