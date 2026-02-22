import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock child components
vi.mock('./notification-type-icon', () => ({
  NotificationTypeIcon: ({ type }: { type: string }) => (
    <span data-testid={`type-icon-${type}`}>Icon</span>
  ),
  getTypeBorderColor: (type: string) => `border-l-${type}`,
}));

vi.mock('./notification-utils', () => ({
  formatRelativeTime: (ts: string) => '5m ago',
}));

import { NotificationItem } from './notification-item';
import type { Notification } from '@/lib/types';

const mockRouter = { push: vi.fn() };
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation');
  return { ...actual, useRouter: () => mockRouter };
});

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    user_id: 'u-1',
    type: 'reminder',
    title: 'Study Reminder',
    message: 'Time to study your course',
    action_url: null,
    read: false,
    channels_sent: [],
    metadata: null,
    created_at: '2026-02-20T10:00:00Z',
    ...overrides,
  };
}

describe('NotificationItem', () => {
  const onMarkAsRead = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notification title and message', () => {
    const n = makeNotification();
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    expect(screen.getByText('Study Reminder')).toBeDefined();
    expect(screen.getByText('Time to study your course')).toBeDefined();
  });

  it('renders the type icon for the notification type', () => {
    const n = makeNotification({ type: 'achievement' });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    expect(screen.getByTestId('type-icon-achievement')).toBeDefined();
  });

  it('renders relative time', () => {
    const n = makeNotification();
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    expect(screen.getByText('5m ago')).toBeDefined();
  });

  it('shows mark-as-read button for unread notifications', () => {
    const n = makeNotification({ read: false });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    expect(screen.getByLabelText('Mark notification as read')).toBeDefined();
  });

  it('hides mark-as-read button for read notifications', () => {
    const n = makeNotification({ read: true });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    expect(screen.queryByLabelText('Mark notification as read')).toBeNull();
  });

  it('calls onMarkAsRead with notification id when mark-read button is clicked', () => {
    const n = makeNotification({ id: 'n-42', read: false });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByLabelText('Mark notification as read'));
    expect(onMarkAsRead).toHaveBeenCalledWith('n-42');
  });

  it('always shows delete button', () => {
    const n = makeNotification({ read: true });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    expect(screen.getByLabelText('Delete notification')).toBeDefined();
  });

  it('calls onDelete with notification id when delete button is clicked', () => {
    const n = makeNotification({ id: 'n-99' });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByLabelText('Delete notification'));
    expect(onDelete).toHaveBeenCalledWith('n-99');
  });

  it('navigates and marks as read when an unread notification with action_url is clicked', () => {
    const n = makeNotification({ id: 'n-10', read: false, action_url: '/courses/123' });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    // Click on the outer container (role=listitem)
    fireEvent.click(screen.getByRole('listitem'));
    expect(onMarkAsRead).toHaveBeenCalledWith('n-10');
    expect(mockRouter.push).toHaveBeenCalledWith('/courses/123');
  });

  it('navigates without marking as read when a read notification with action_url is clicked', () => {
    const n = makeNotification({ read: true, action_url: '/courses/456' });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByRole('listitem'));
    expect(onMarkAsRead).not.toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/courses/456');
  });

  it('does not navigate when notification has no action_url', () => {
    const n = makeNotification({ action_url: null });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByRole('listitem'));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('renders channel badges when channels_sent is populated', () => {
    const n = makeNotification({ channels_sent: ['in_app', 'email'] });
    render(
      <NotificationItem notification={n} onMarkAsRead={onMarkAsRead} onDelete={onDelete} />
    );
    expect(screen.getByText('in-app')).toBeDefined();
    expect(screen.getByText('email')).toBeDefined();
  });
});
