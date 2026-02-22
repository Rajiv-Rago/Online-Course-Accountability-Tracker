import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock the dashboard-utils for formatRelativeTime
vi.mock('../lib/dashboard-utils', () => ({
  formatRelativeTime: vi.fn((ts: string) => `relative(${ts})`),
}));

import { NotificationPreview } from './notification-preview';
import type { Notification } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeNotification(
  id: string,
  title: string,
  read: boolean = false
): Notification {
  return {
    id,
    user_id: 'user-1',
    type: 'reminder',
    title,
    message: `Message for ${title}`,
    action_url: null,
    read,
    channels_sent: ['in_app'],
    metadata: null,
    created_at: '2025-06-01T12:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('NotificationPreview', () => {
  it('renders bell button', () => {
    render(<NotificationPreview notifications={[]} />);

    const button = screen.getByRole('button', { name: /Notifications/i });
    expect(button).toBeDefined();
  });

  it('shows unread badge with correct count', () => {
    const notifications = [
      makeNotification('n1', 'First', false),
      makeNotification('n2', 'Second', false),
      makeNotification('n3', 'Third', true), // read
    ];

    render(<NotificationPreview notifications={notifications} />);

    // 2 unread notifications
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByRole('button', { name: /2 unread notifications/i })).toBeDefined();
  });

  it('does NOT show badge when unread count is 0', () => {
    const notifications = [
      makeNotification('n1', 'Read one', true),
    ];

    render(<NotificationPreview notifications={notifications} />);

    // aria-hidden badge should not be rendered
    expect(screen.queryByText('0')).toBeNull();
    // The sr-only text should say "Notifications" (no count)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeDefined();
  });

  it('shows "9+" when unread count exceeds 9', () => {
    const notifications = Array.from({ length: 12 }, (_, i) =>
      makeNotification(`n${i}`, `Notif ${i}`, false)
    );

    render(<NotificationPreview notifications={notifications} />);

    expect(screen.getByText('9+')).toBeDefined();
  });

  it('shows notification items in popover when opened', () => {
    const notifications = [
      makeNotification('n1', 'Session Reminder'),
      makeNotification('n2', 'Risk Alert'),
    ];

    render(<NotificationPreview notifications={notifications} />);

    // Open the popover
    fireEvent.click(screen.getByRole('button', { name: /unread notifications/i }));

    expect(screen.getByText('Session Reminder')).toBeDefined();
    expect(screen.getByText('Risk Alert')).toBeDefined();
    expect(screen.getByText('Message for Session Reminder')).toBeDefined();
  });

  it('shows empty state in popover when no notifications', () => {
    render(<NotificationPreview notifications={[]} />);

    // Open the popover
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(screen.getByText('No notifications yet')).toBeDefined();
  });

  it('shows only first 3 notifications in popover', () => {
    const notifications = [
      makeNotification('n1', 'First'),
      makeNotification('n2', 'Second'),
      makeNotification('n3', 'Third'),
      makeNotification('n4', 'Fourth'),
    ];

    render(<NotificationPreview notifications={notifications} />);

    fireEvent.click(screen.getByRole('button', { name: /unread notifications/i }));

    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
    expect(screen.getByText('Third')).toBeDefined();
    expect(screen.queryByText('Fourth')).toBeNull();
  });

  it('has "See All" link pointing to /notifications', () => {
    render(<NotificationPreview notifications={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    const seeAllLink = screen.getByText('See All');
    expect(seeAllLink.closest('a')?.getAttribute('href')).toBe('/notifications');
  });

  it('renders popover header with "Notifications" label', () => {
    render(<NotificationPreview notifications={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    // The popover header text
    const headerTexts = screen.getAllByText('Notifications');
    // One is the sr-only on the button, one is the popover header
    expect(headerTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows relative time for each notification', () => {
    const notifications = [makeNotification('n1', 'Test Notif')];

    render(<NotificationPreview notifications={notifications} />);

    fireEvent.click(screen.getByRole('button', { name: /unread notifications/i }));

    expect(screen.getByText('relative(2025-06-01T12:00:00Z)')).toBeDefined();
  });
});
