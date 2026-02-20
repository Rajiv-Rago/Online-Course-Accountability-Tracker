'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Notification } from '@/lib/types';
import type { ActionResult } from '@/lib/types/shared';
import { sendToChannels } from '../lib/notification-sender';
import type { NotificationTypeValue } from '../lib/notification-validation';

async function getAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

// ---------------------------------------------------------------------------
// GET NOTIFICATIONS (paginated + filtered)
// ---------------------------------------------------------------------------
export async function getNotifications(options: {
  type?: string | null;
  unreadOnly?: boolean;
  cursor?: string | null;
  limit?: number;
}): Promise<
  ActionResult<{ notifications: Notification[]; nextCursor: string | null }>
> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();
    const limit = options.limit ?? 20;

    let query = supabase
      .from('notifications')
      .select(
        'id, type, title, message, read, action_url, channels_sent, metadata, created_at, user_id'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options.type) {
      query = query.eq('type', options.type);
    }

    if (options.unreadOnly) {
      query = query.eq('read', false);
    }

    if (options.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };

    const notifications = (data ?? []) as Notification[];
    const nextCursor =
      notifications.length === limit
        ? notifications[notifications.length - 1].created_at
        : null;

    return { data: { notifications, nextCursor } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// GET UNREAD COUNT
// ---------------------------------------------------------------------------
export async function getUnreadCount(): Promise<ActionResult<number>> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return { error: error.message };
    return { data: count ?? 0 };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// MARK AS READ
// ---------------------------------------------------------------------------
export async function markAsRead(
  notificationId: string
): Promise<ActionResult> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) return { error: error.message };
    revalidatePath('/notifications');
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// MARK ALL AS READ
// ---------------------------------------------------------------------------
export async function markAllAsRead(): Promise<ActionResult> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return { error: error.message };
    revalidatePath('/notifications');
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// DELETE NOTIFICATION
// ---------------------------------------------------------------------------
export async function deleteNotification(
  notificationId: string
): Promise<ActionResult> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) return { error: error.message };
    revalidatePath('/notifications');
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// CREATE NOTIFICATION FOR DELIVERY (server-side use, e.g. from scheduler)
// ---------------------------------------------------------------------------
export async function createNotificationForDelivery(payload: {
  userId: string;
  type: NotificationTypeValue;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResult<Notification>> {
  try {
    const supabase = await createClient();

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        action_url: payload.actionUrl ?? null,
        metadata: payload.metadata ?? null,
        channels_sent: ['in_app'],
      })
      .select()
      .single();

    if (error) return { error: error.message };

    // Trigger multi-channel delivery asynchronously
    try {
      await sendToChannels(notification);
    } catch {
      // Fire-and-forget for MVP - notification is already created in-app
    }

    return { data: notification as Notification };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
