/**
 * Web Push adapter stub.
 *
 * Push notifications require the `web-push` npm package and VAPID keys.
 * Since `web-push` is not currently installed, this adapter returns a
 * graceful "not configured" error. When you're ready to enable push:
 *
 *   1. npm install web-push
 *   2. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars
 *   3. Implement the full push logic below
 */

interface PushSubscriptionJSON {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPush(_params: {
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

  // web-push package is not installed. Return gracefully.
  // When installed, use: webpush.setVapidDetails(...) + webpush.sendNotification(...)
  return { success: false, error: 'web-push package not installed - push notifications disabled' };
}
