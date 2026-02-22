import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock formatRelativeTime
vi.mock('../lib/dashboard-utils', () => ({
  formatRelativeTime: vi.fn((ts: string) => `relative(${ts})`),
}));

import { BuddyActivitySidebar } from './buddy-activity-sidebar';
import type { BuddyActivityItem } from '../lib/dashboard-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBuddy(
  id: string,
  name: string,
  recentSession: { courseTitle: string; startedAt: string } | null = null,
  avatar: string | null = null
): BuddyActivityItem {
  return {
    buddyId: id,
    buddyName: name,
    buddyAvatar: avatar,
    recentSession,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BuddyActivitySidebar', () => {
  it('renders "Study Buddies" heading', () => {
    render(<BuddyActivitySidebar buddies={[]} />);

    expect(screen.getByText('Study Buddies')).toBeDefined();
  });

  it('shows empty state with motivational text when no buddies', () => {
    render(<BuddyActivitySidebar buddies={[]} />);

    expect(
      screen.getByText(/Connect with study buddies to stay motivated/)
    ).toBeDefined();
  });

  it('shows "Find Buddies" button in empty state', () => {
    render(<BuddyActivitySidebar buddies={[]} />);

    const findLink = screen.getByText('Find Buddies');
    expect(findLink.closest('a')?.getAttribute('href')).toBe('/buddies');
  });

  it('renders buddy names', () => {
    const buddies = [
      makeBuddy('b1', 'Alice'),
      makeBuddy('b2', 'Bob'),
    ];

    render(<BuddyActivitySidebar buddies={buddies} />);

    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
  });

  it('renders buddy recent session info', () => {
    const buddies = [
      makeBuddy('b1', 'Alice', {
        courseTitle: 'React Advanced',
        startedAt: '2025-06-01T14:00:00Z',
      }),
    ];

    render(<BuddyActivitySidebar buddies={buddies} />);

    // Course title and relative time should appear
    expect(screen.getByText(/React Advanced/)).toBeDefined();
    expect(screen.getByText(/relative\(2025-06-01T14:00:00Z\)/)).toBeDefined();
  });

  it('shows "No recent activity" when buddy has no recent session', () => {
    const buddies = [makeBuddy('b1', 'Alice', null)];

    render(<BuddyActivitySidebar buddies={buddies} />);

    expect(screen.getByText('No recent activity')).toBeDefined();
  });

  it('limits display to top 5 buddies', () => {
    const buddies = Array.from({ length: 7 }, (_, i) =>
      makeBuddy(`b${i}`, `Buddy ${i}`)
    );

    render(<BuddyActivitySidebar buddies={buddies} />);

    expect(screen.getByText('Buddy 0')).toBeDefined();
    expect(screen.getByText('Buddy 4')).toBeDefined();
    expect(screen.queryByText('Buddy 5')).toBeNull();
    expect(screen.queryByText('Buddy 6')).toBeNull();
  });

  it('renders avatar fallback with first 2 characters uppercased', () => {
    const buddies = [makeBuddy('b1', 'Alice', null, null)];

    render(<BuddyActivitySidebar buddies={buddies} />);

    expect(screen.getByText('AL')).toBeDefined();
  });

  it('does NOT show empty state when buddies are present', () => {
    const buddies = [makeBuddy('b1', 'Alice')];

    render(<BuddyActivitySidebar buddies={buddies} />);

    expect(screen.queryByText(/Connect with study buddies/)).toBeNull();
    expect(screen.queryByText('Find Buddies')).toBeNull();
  });

  it('renders exactly 5 buddies when given 5', () => {
    const buddies = Array.from({ length: 5 }, (_, i) =>
      makeBuddy(`b${i}`, `Buddy ${i}`)
    );

    render(<BuddyActivitySidebar buddies={buddies} />);

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Buddy ${i}`)).toBeDefined();
    }
  });
});
