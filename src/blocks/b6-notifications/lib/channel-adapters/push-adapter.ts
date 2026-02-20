/**
 * Web Push adapter.
 *
 * Uses the `web-push` npm package to send push notifications.
 * Requires VAPID keys configured via environment variables:
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   - VAPID_PRIVATE_KEY
 *
 * If keys are not configured, returns a graceful error.
 */

import webpush from 'web-push';

interface PushSubscriptionJSON {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPush(params: {
  subscription: PushSubscriptionJSON;
  title: string;
  body: string;
  actionUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return { success: false, error: 'VAPID keys not configured' };
  }

  if (!params.subscription.endpoint || !params.subscription.keys) {
    return { success: false, error: 'Invalid push subscription' };
  }

  try {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'noreply@example.com'}`,
      publicKey,
      privateKey
    );

    const payload = JSON.stringify({
      title: params.title,
      body: params.body,
      url: params.actionUrl ?? '/',
    });

    await webpush.sendNotification(
      {
        endpoint: params.subscription.endpoint,
        keys: params.subscription.keys,
      },
      payload
    );

    return { success: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 410 Gone = subscription expired, 404 = not found
    if (statusCode === 410 || statusCode === 404) {
      return { success: false, error: 'Push subscription expired' };
    }
    return { success: false, error: (err as Error).message ?? 'Push send failed' };
  }
}
