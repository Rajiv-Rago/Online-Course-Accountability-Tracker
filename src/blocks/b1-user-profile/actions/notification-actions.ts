'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/lib/types/shared';
import { notificationPrefsSchema, type NotificationPrefs } from '../lib/profile-validation';

async function getAuthUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, userId: user.id };
}

export async function updateNotificationPrefs(
  prefs: NotificationPrefs
): Promise<UserProfile> {
  const parsed = notificationPrefsSchema.parse(prefs);
  const { supabase, userId } = await getAuthUserId();

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
  const { supabase, userId } = await getAuthUserId();

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      slack_webhook_url: urls.slack_webhook_url || null,
      discord_webhook_url: urls.discord_webhook_url || null,
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
