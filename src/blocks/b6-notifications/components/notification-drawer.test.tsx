import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock hooks
const mockMarkAsReadMutate = vi.fn();
const mockMarkAllAsReadMutate = vi.fn();

vi.mock('../hooks/use-notifications', () => ({
  useNotifications: vi.fn(() => ({
    data: { pages: [{ notifications: [], nextCursor: null }] },
    isLoading: false,
  })),
  useNotificationMutations: vi.fn(() => ({
    markAsRead: { mutate: mockMarkAsReadMutate },
    markAllAsRead: { mutate: mockMarkAllAsReadMutate, isPending: false },
  })),
}));

// Mock shadcn Sheet (Radix Dialog portal does not render in jsdom)
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

// Mock child components
vi.mock('./notification-type-icon', () => ({
  NotificationTypeIcon: ({ type }: { type: string }) => (
    <span data-testid={`type-icon-${type}`}>Icon</span>
  ),
}));

vi.mock('./notification-utils', () => ({
  formatRelativeTime: () => '2h ago',
}));

import { NotificationDrawer } from './notification-drawer';
import { useNotifications, useNotificationMutations } from '../hooks/use-notifications';
import type { Notification } from '@/lib/types';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    user_id: 'u-1',
    type: 'reminder',
    title: 'Test Notification',
    message: 'Test message body',
    action_url: '/courses/1',
    read: false,
    channels_sent: ['in_app'],
    metadata: null,
    created_at: '2026-02-20T10:00:00Z',
    ...overrides,
  };
}

describe('NotificationDrawer', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ notifications: [], nextCursor: null }] },
      isLoading: false,
    } as any);
    vi.mocked(useNotificationMutations).mockReturnValue({
      markAsRead: { mutate: mockMarkAsReadMutate },
      markAllAsRead: { mutate: mockMarkAllAsReadMutate, isPending: false },
    } as any);
  });

  it('renders nothing when isOpen is false', () => {
    render(<NotificationDrawer isOpen={false} onClose={onClose} />);
    // The Sheet should not render its content
    expect(screen.queryByText('Notifications')).toBeNull();
  });

  it('renders sheet title when isOpen is true', () => {
    render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Notifications')).toBeDefined();
  });

  it('renders "See All" link', () => {
    render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText('See All')).toBeDefined();
  });

  it('shows empty message when no notifications', () => {
    render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText('No notifications yet')).toBeDefined();
  });

  it('does not show Mark All as Read button when no notifications', () => {
    render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    expect(screen.queryByText('Mark All as Read')).toBeNull();
  });

  it('renders notification items when data exists', () => {
    const notifications = [
      makeNotification({ id: 'n-1', title: 'First notification' }),
      makeNotification({ id: 'n-2', title: 'Second notification', read: true }),
    ];
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ notifications, nextCursor: null }] },
      isLoading: false,
    } as any);
    render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText('First notification')).toBeDefined();
    expect(screen.getByText('Second notification')).toBeDefined();
  });

  it('renders relative time for each notification', () => {
    const notifications = [makeNotification()];
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ notifications, nextCursor: null }] },
      isLoading: false,
    } as any);
    render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText('2h ago')).toBeDefined();
  });

  it('shows Mark All as Read button when notifications exist', () => {
    const notifications = [makeNotification()];
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ notifications, nextCursor: null }] },
      isLoading: false,
    } as any);
    render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Mark All as Read')).toBeDefined();
  });

  it('calls markAllAsRead when Mark All as Read is clicked', () => {
    const notifications = [makeNotification()];
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ notifications, nextCursor: null }] },
      isLoading: false,
    } as any);
    render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Mark All as Read'));
    expect(mockMarkAllAsReadMutate).toHaveBeenCalled();
  });

  it('shows unread indicator dot for unread notifications', () => {
    const notifications = [makeNotification({ read: false })];
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ notifications, nextCursor: null }] },
      isLoading: false,
    } as any);
    const { container } = render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    // The unread dot is a div with bg-primary class
    const dots = container.querySelectorAll('.bg-primary');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('renders type icons for notifications', () => {
    const notifications = [makeNotification({ type: 'achievement' })];
    vi.mocked(useNotifications).mockReturnValue({
      data: { pages: [{ notifications, nextCursor: null }] },
      isLoading: false,
    } as any);
    render(<NotificationDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByTestId('type-icon-achievement')).toBeDefined();
  });
});
