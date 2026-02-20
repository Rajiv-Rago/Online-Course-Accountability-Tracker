import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock hooks and child components BEFORE importing the component
vi.mock('../hooks/use-unread-count', () => ({
  useUnreadCount: vi.fn(() => ({ unreadCount: 0 })),
}));

vi.mock('./notification-drawer', () => ({
  NotificationDrawer: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="notification-drawer">Drawer Open</div> : null
  ),
}));

import { NotificationBell } from './notification-bell';
import { useUnreadCount } from '../hooks/use-unread-count';

describe('NotificationBell', () => {
  it('renders bell button', () => {
    render(<NotificationBell />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('shows "Notifications" aria-label when no unread', () => {
    render(<NotificationBell />);
    expect(screen.getByLabelText('Notifications')).toBeDefined();
  });

  it('shows unread count in aria-label when has unread', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 3 } as any);

    render(<NotificationBell />);
    expect(screen.getByLabelText('Notifications, 3 unread')).toBeDefined();
  });

  it('shows badge with count when has unread', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 5 } as any);

    render(<NotificationBell />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('caps badge at 9+', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 15 } as any);

    render(<NotificationBell />);
    expect(screen.getByText('9+')).toBeDefined();
  });

  it('does not show badge when unreadCount is 0', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 0 } as any);

    render(<NotificationBell />);
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByText('9+')).toBeNull();
  });

  it('opens drawer on click', () => {
    vi.mocked(useUnreadCount).mockReturnValue({ unreadCount: 0 } as any);

    render(<NotificationBell />);
    expect(screen.queryByTestId('notification-drawer')).toBeNull();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('notification-drawer')).toBeDefined();
  });
});
