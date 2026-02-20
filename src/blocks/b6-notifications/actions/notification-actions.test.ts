import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, DEFAULT_USER } from '@/test/helpers/auth';
import { buildNotification } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
});

describe('getNotifications', () => {
  it('returns notifications with cursor-based pagination', async () => {
    const notifications = Array.from({ length: 20 }, (_, i) =>
      buildNotification({
        title: `Notification ${i}`,
        created_at: `2024-06-15T${String(10 + i).padStart(2, '0')}:00:00Z`,
      })
    );
    mockClient.__setTableResult('notifications', { data: notifications, error: null });

    const { getNotifications } = await import('./notification-actions');
    const result = await getNotifications({ limit: 20 });

    expect(result.data!.notifications).toHaveLength(20);
    // When results fill the limit, nextCursor should be set from the last item
    const lastNotif = notifications[notifications.length - 1];
    expect(result.data!.nextCursor).toBe(`${lastNotif.created_at}|${lastNotif.id}`);
  });

  it('returns null cursor when fewer results than limit', async () => {
    const notifications = [buildNotification(), buildNotification()];
    mockClient.__setTableResult('notifications', { data: notifications, error: null });

    const { getNotifications } = await import('./notification-actions');
    const result = await getNotifications({ limit: 20 });

    expect(result.data!.notifications).toHaveLength(2);
    expect(result.data!.nextCursor).toBeNull();
  });

  it('defaults to limit=20 when not specified', async () => {
    // Return exactly 20 items -> cursor should be set
    const notifications = Array.from({ length: 20 }, () => buildNotification());
    mockClient.__setTableResult('notifications', { data: notifications, error: null });

    const { getNotifications } = await import('./notification-actions');
    const result = await getNotifications({});

    expect(result.data!.notifications).toHaveLength(20);
    expect(result.data!.nextCursor).not.toBeNull();
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { getNotifications } = await import('./notification-actions');
    const result = await getNotifications({});
    expect(result.error).toBeDefined();
  });

  it('propagates DB error', async () => {
    mockClient.__setTableResult('notifications', { data: null, error: { message: 'DB error' } });

    const { getNotifications } = await import('./notification-actions');
    const result = await getNotifications({});
    expect(result.error).toBe('DB error');
  });
});

describe('getUnreadCount', () => {
  it('returns the exact count of unread notifications', async () => {
    mockClient.__setTableResult('notifications', { data: null, error: null, count: 7 });

    const { getUnreadCount } = await import('./notification-actions');
    const result = await getUnreadCount();
    expect(result.data).toBe(7);
  });

  it('returns 0 when count is null (no unread)', async () => {
    mockClient.__setTableResult('notifications', { data: null, error: null, count: undefined });

    const { getUnreadCount } = await import('./notification-actions');
    const result = await getUnreadCount();
    expect(result.data).toBe(0);
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { getUnreadCount } = await import('./notification-actions');
    const result = await getUnreadCount();
    expect(result.error).toBeDefined();
  });
});

describe('markAsRead', () => {
  it('updates read=true and scopes to user_id for ownership', async () => {
    mockClient.__setResult('notifications', 'update', { data: null, error: null });

    const { markAsRead } = await import('./notification-actions');
    const result = await markAsRead('notif-abc');
    expect(result.error).toBeUndefined();

    // Verify the update data is { read: true }
    const updateCalls = mockClient.__getCalls('notifications', 'update');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].data).toEqual({ read: true });

    // Verify filters include both notification ID and user_id (ownership check)
    const filters = updateCalls[0].filters;
    const eqFilters = filters.filter((f) => f.method === 'eq');
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['id', 'notif-abc'] });
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['user_id', DEFAULT_USER.id] });
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { markAsRead } = await import('./notification-actions');
    const result = await markAsRead('notif-1');
    expect(result.error).toBeDefined();
  });
});

describe('markAllAsRead', () => {
  it('updates read=true scoped to user_id and only unread notifications', async () => {
    mockClient.__setResult('notifications', 'update', { data: null, error: null });

    const { markAllAsRead } = await import('./notification-actions');
    const result = await markAllAsRead();
    expect(result.error).toBeUndefined();

    const updateCalls = mockClient.__getCalls('notifications', 'update');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].data).toEqual({ read: true });

    // Should filter by user_id AND read=false (only mark currently unread)
    const filters = updateCalls[0].filters;
    const eqFilters = filters.filter((f) => f.method === 'eq');
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['user_id', DEFAULT_USER.id] });
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['read', false] });
  });
});

describe('deleteNotification', () => {
  it('deletes scoped to both notification ID and user_id', async () => {
    mockClient.__setResult('notifications', 'delete', { data: null, error: null });

    const { deleteNotification } = await import('./notification-actions');
    const result = await deleteNotification('notif-xyz');
    expect(result.error).toBeUndefined();

    const deleteCalls = mockClient.__getCalls('notifications', 'delete');
    expect(deleteCalls).toHaveLength(1);

    // Verify filters include both ID and user_id (prevents deleting other users' notifications)
    const filters = deleteCalls[0].filters;
    const eqFilters = filters.filter((f) => f.method === 'eq');
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['id', 'notif-xyz'] });
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['user_id', DEFAULT_USER.id] });
  });
});

describe('createNotificationForDelivery', () => {
  it('inserts notification with correct payload structure', async () => {
    const notification = buildNotification({ type: 'achievement', title: 'Achievement Unlocked!' });
    mockClient.__setResult('notifications', 'insert', { data: notification, error: null });
    vi.mock('@/blocks/b6-notifications/lib/notification-sender', () => ({
      sendToChannels: vi.fn().mockResolvedValue({ channelsSent: ['in_app'], errors: [] }),
    }));

    const { createNotificationForDelivery } = await import('./notification-actions');
    const result = await createNotificationForDelivery({
      userId: DEFAULT_USER.id,
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: 'You earned first_session',
      actionUrl: '/social/achievements',
      metadata: { achievementType: 'first_session' },
    });

    expect(result.data).toEqual(notification);

    // Verify the insert payload
    const insertCalls = mockClient.__getCalls('notifications', 'insert');
    expect(insertCalls).toHaveLength(1);
    const insertedData = insertCalls[0].data as Record<string, unknown>;
    expect(insertedData.user_id).toBe(DEFAULT_USER.id);
    expect(insertedData.type).toBe('achievement');
    expect(insertedData.title).toBe('Achievement Unlocked!');
    expect(insertedData.message).toBe('You earned first_session');
    expect(insertedData.action_url).toBe('/social/achievements');
    expect(insertedData.metadata).toEqual({ achievementType: 'first_session' });
    expect(insertedData.channels_sent).toEqual(['in_app']);
  });

  it('defaults action_url and metadata to null when omitted', async () => {
    const notification = buildNotification();
    mockClient.__setResult('notifications', 'insert', { data: notification, error: null });
    vi.mock('@/blocks/b6-notifications/lib/notification-sender', () => ({
      sendToChannels: vi.fn().mockResolvedValue({ channelsSent: ['in_app'], errors: [] }),
    }));

    const { createNotificationForDelivery } = await import('./notification-actions');
    await createNotificationForDelivery({
      userId: DEFAULT_USER.id,
      type: 'reminder',
      title: 'Study time',
      message: 'Time to study!',
    });

    const insertCalls = mockClient.__getCalls('notifications', 'insert');
    const insertedData = insertCalls[0].data as Record<string, unknown>;
    expect(insertedData.action_url).toBeNull();
    expect(insertedData.metadata).toBeNull();
  });
});
