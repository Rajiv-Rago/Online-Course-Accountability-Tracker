import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock ActivityItem to isolate RecentActivityFeed
vi.mock('./activity-item', () => ({
  ActivityItem: ({ item }: { item: { id: string; description: string } }) => (
    <li data-testid={`activity-${item.id}`}>{item.description}</li>
  ),
}));

import { RecentActivityFeed } from './recent-activity-feed';
import type { ActivityItemData } from '../lib/dashboard-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeActivityItem(
  id: string,
  description: string,
  type: 'session' | 'achievement' | 'analysis' = 'session',
  actionUrl: string | null = null
): ActivityItemData {
  return {
    id,
    type,
    icon: type === 'session' ? 'Clock' : type === 'achievement' ? 'Trophy' : 'AlertTriangle',
    description,
    timestamp: '2025-06-01T12:00:00Z',
    relativeTime: '2h ago',
    actionUrl,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('RecentActivityFeed', () => {
  it('renders empty state when no items', () => {
    render(<RecentActivityFeed items={[]} />);

    expect(screen.getByText(/No recent activity/)).toBeDefined();
    expect(screen.getByText(/Start a study session to see your progress here/)).toBeDefined();
  });

  it('renders activity items', () => {
    const items = [
      makeActivityItem('s1', 'Studied React for 30m'),
      makeActivityItem('a1', 'Earned: First Session', 'achievement'),
    ];

    render(<RecentActivityFeed items={items} />);

    expect(screen.getByText('Studied React for 30m')).toBeDefined();
    expect(screen.getByText('Earned: First Session')).toBeDefined();
  });

  it('renders "Recent Activity" heading when items exist', () => {
    const items = [makeActivityItem('s1', 'Test activity')];

    render(<RecentActivityFeed items={items} />);

    expect(screen.getByText('Recent Activity')).toBeDefined();
  });

  it('does NOT render heading when items array is empty', () => {
    render(<RecentActivityFeed items={[]} />);

    expect(screen.queryByText('Recent Activity')).toBeNull();
  });

  it('renders a feed role list for accessibility', () => {
    const items = [makeActivityItem('s1', 'Activity 1')];

    render(<RecentActivityFeed items={items} />);

    const feed = screen.getByRole('feed');
    expect(feed).toBeDefined();
  });

  it('renders multiple items in order', () => {
    const items = [
      makeActivityItem('s1', 'First activity'),
      makeActivityItem('s2', 'Second activity'),
      makeActivityItem('s3', 'Third activity'),
    ];

    render(<RecentActivityFeed items={items} />);

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    expect(listItems[0].textContent).toBe('First activity');
    expect(listItems[1].textContent).toBe('Second activity');
    expect(listItems[2].textContent).toBe('Third activity');
  });

  it('passes correct item data to ActivityItem', () => {
    const items = [
      makeActivityItem('analysis-1', 'Risk alert for React', 'analysis'),
    ];

    render(<RecentActivityFeed items={items} />);

    expect(screen.getByTestId('activity-analysis-1')).toBeDefined();
    expect(screen.getByText('Risk alert for React')).toBeDefined();
  });
});
