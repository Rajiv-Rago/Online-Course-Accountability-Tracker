import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock hooks BEFORE importing the component
const mockMarkAsReadMutate = vi.fn();
const mockMarkAllAsReadMutate = vi.fn();
const mockDeleteNotificationMutate = vi.fn();
const mockFetchNextPage = vi.fn();

vi.mock('../hooks/use-notifications', () => ({
  useNotifications: vi.fn(() => ({
    data: { pages: [{ notifications: [], nextCursor: null }] },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
  })),
  useNotificationMutations: vi.fn(() => ({
    markAsRead: { mutate: mockMarkAsReadMutate },
    markAllAsRead: { mutate: mockMarkAllAsReadMutate, isPending: false },
    deleteNotification: { mutate: mockDeleteNotificationMutate },
  })),
}));

vi.mock('../hooks/use-unread-count', () => ({
  useUnreadCount: vi.fn(() => ({ unreadCount: 0 })),
}));

// Mock child components with minimal stubs
vi.mock('./notification-item', () => ({
  NotificationItem: ({ notification, onMarkAsRead, onDelete }: any) => (
    <div data-testid={`notification-${notification.id}`} role="listitem">
      <span>{notification.title}</span>
      <button onClick={() => onMarkAsRead(notification.id)}>Mark Read</button>
      <button onClick={() => onDelete(notification.id)}>Delete</button>
    </div>
  ),
}));

vi.mock('./notification-filters', () => ({
  NotificationFilters: ({ onTypeChange, onUnreadOnlyChange }: any) => (
    <div data-testid="notification-filters">
      <button onClick={() => onTypeChange('reminder')}>Filter Type</button>
      <button onClick={() => onUnreadOnlyChange(true)}>Toggle Unread</button>
    </div>
  ),
}));

vi.mock('./empty-notifications', () => ({
  EmptyNotifications: ({ hasFiltersApplied }: { hasFiltersApplied: boolean }) => (
    <div data-testid="empty-notifications">
      {hasFiltersApplied ? 'No match' : 'All caught up'}
    </div>
  ),
}));

vi.mock('./reminder-list', () => ({
  ReminderList: () => <div data-testid="reminder-list">Reminders</div>,
}));

import { NotificationCenter } from './notification-center';
import { useNotifications, useNotificationMutations } from '../hooks/use-notifications';
import { useUnreadCount } from '../hooks/use-unread-count';
import type { Notification } from '@/lib/types';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    user_id: 'u-1',
    type: 'reminder',
    title: 'Study Time',
    message: 'Time to study React',
    action_url: null,
    read: false,
    channels_sent: ['in_app'],
    metadata: null,
    created_at: '2026-02-20T10:00:00Z',
    ...overrides,
  };
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to defaults
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ notifications: [], nextCursor: null }] },
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
    } as any);
    vi.mocked(useNotificationMutations).mockReturnValue({
      markAsRead: { mutate: mockMarkAsReadMutate },
      markAllAsRead: { mutate: mockMarkAllAsReadMutate, isPending: false },
      deleteNotification: { mutate: mockDeleteNotificationMutate },
    } as any);
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 0 } as any);
  });

  it('renders the Notifications heading', () => {
    render(<NotificationCenter />);
    expect(screen.getByText('Notifications')).toBeDefined();
  });

  it('shows unread count badge when there are unread notifications', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 5 } as any);
    render(<NotificationCenter />);
    expect(screen.getByText('5 unread')).toBeDefined();
  });

  it('does not show unread count badge when unreadCount is 0', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 0 } as any);
    render(<NotificationCenter />);
    expect(screen.queryByText(/unread/)).toBeNull();
  });

  it('disables Mark All Read button when unread count is 0', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 0 } as any);
    render(<NotificationCenter />);
    const button = screen.getByText('Mark All Read').closest('button')!;
    expect(button.disabled).toBe(true);
  });

  it('enables Mark All Read button when there are unread notifications', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 3 } as any);
    render(<NotificationCenter />);
    const button = screen.getByText('Mark All Read').closest('button')!;
    expect(button.disabled).toBe(false);
  });

  it('calls markAllAsRead when Mark All Read button is clicked', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 3 } as any);
    render(<NotificationCenter />);
    fireEvent.click(screen.getByText('Mark All Read'));
    expect(mockMarkAllAsReadMutate).toHaveBeenCalled();
  });

  it('shows loading skeleton when isLoading is true', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
    } as any);
    render(<NotificationCenter />);
    // Skeletons are rendered; empty state should not appear
    expect(screen.queryByTestId('empty-notifications')).toBeNull();
    // There should be no notification items
    expect(screen.queryByTestId('notification-n-1')).toBeNull();
  });

  it('shows empty state when no notifications and no filters', () => {
    render(<NotificationCenter />);
    expect(screen.getByTestId('empty-notifications')).toBeDefined();
    expect(screen.getByText('All caught up')).toBeDefined();
  });

  it('renders notification items when data is available', () => {
    const notifications = [
      makeNotification({ id: 'n-1', title: 'Notification One' }),
      makeNotification({ id: 'n-2', title: 'Notification Two' }),
    ];
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ notifications, nextCursor: null }] },
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
    } as any);
    render(<NotificationCenter />);
    expect(screen.getByTestId('notification-n-1')).toBeDefined();
    expect(screen.getByTestId('notification-n-2')).toBeDefined();
    expect(screen.getByText('Notification One')).toBeDefined();
    expect(screen.getByText('Notification Two')).toBeDefined();
  });

  it('renders the filters component', () => {
    render(<NotificationCenter />);
    expect(screen.getByTestId('notification-filters')).toBeDefined();
  });

  it('renders the reminders section', () => {
    render(<NotificationCenter />);
    expect(screen.getByTestId('reminder-list')).toBeDefined();
  });

  it('passes hasFiltersApplied=true to EmptyNotifications when type filter is active', () => {
    render(<NotificationCenter />);
    // Activate the type filter via mocked NotificationFilters
    fireEvent.click(screen.getByText('Filter Type'));
    // After state update, the empty-notifications should show filter message
    expect(screen.getByText('No match')).toBeDefined();
  });
});
