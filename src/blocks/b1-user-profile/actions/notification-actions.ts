'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { UserProfile } from '@/lib/types/shared';
import { notificationPrefsSchema, webhookUrlSchema, type NotificationPrefs } from '../lib/profile-validation';
import { getAuthUser } from './get-auth-user';

const slackUrlSchema = z.string().url().startsWith('https://hooks.slack.com/');
const discordUrlSchema = z.string().url().startsWith('https://discord.com/api/webhooks/');

export async function updateNotificationPrefs(
  prefs: NotificationPrefs
): Promise<UserProfile> {
  const parsed = notificationPrefsSchema.parse(prefs);
  const { supabase, userId } = await getAuthUser();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(parsed)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/settings/notifications');
  return data as UserProfile;
}

export async function updateWebhookUrls(urls: {
  slack_webhook_url: string | null;
  discord_webhook_url: string | null;
}): Promise<UserProfile> {
  const parsed = webhookUrlSchema.parse(urls);
  const { supabase, userId } = await getAuthUser();

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      slack_webhook_url: parsed.slack_webhook_url || null,
      discord_webhook_url: parsed.discord_webhook_url || null,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/settings/integrations');
  return data as UserProfile;
}

export async function testSlackWebhook(
  url: string
): Promise<{ success: boolean; error?: string }> {
  // Validate URL to prevent SSRF — only allow Slack webhook URLs
  try {
    slackUrlSchema.parse(url);
  } catch {
    return { success: false, error: 'Invalid Slack webhook URL' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Test notification from Course Accountability Tracker',
      }),
    });
    if (!res.ok) {
      return { success: false, error: `Slack returned status ${res.status}` };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

export async function testDiscordWebhook(
  url: string
): Promise<{ success: boolean; error?: string }> {
  // Validate URL to prevent SSRF — only allow Discord webhook URLs
  try {
    discordUrlSchema.parse(url);
  } catch {
    return { success: false, error: 'Invalid Discord webhook URL' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test notification from Course Accountability Tracker',
      }),
    });
    if (!res.ok) {
      return { success: false, error: `Discord returned status ${res.status}` };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
