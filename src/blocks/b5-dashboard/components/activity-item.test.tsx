import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { ActivityItem } from './activity-item';
import type { ActivityItemData } from '../lib/dashboard-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeItem(overrides: Partial<ActivityItemData> = {}): ActivityItemData {
  return {
    id: 'item-1',
    type: 'session',
    icon: 'Clock',
    description: 'Studied React for 30m',
    timestamp: '2025-06-01T12:00:00Z',
    relativeTime: '2h ago',
    actionUrl: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ActivityItem', () => {
  it('renders description text', () => {
    render(<ActivityItem item={makeItem()} />);

    expect(screen.getByText('Studied React for 30m')).toBeDefined();
  });

  it('renders relative time', () => {
    render(<ActivityItem item={makeItem({ relativeTime: '5m ago' })} />);

    expect(screen.getByText('5m ago')).toBeDefined();
  });

  it('wraps in a link when actionUrl is provided', () => {
    render(
      <ActivityItem
        item={makeItem({ actionUrl: '/courses/c1', description: 'Linked item' })}
      />
    );

    const link = screen.getByText('Linked item').closest('a');
    expect(link).toBeDefined();
    expect(link?.getAttribute('href')).toBe('/courses/c1');
  });

  it('does NOT wrap in a link when actionUrl is null', () => {
    render(
      <ActivityItem
        item={makeItem({ actionUrl: null, description: 'Unlinked item' })}
      />
    );

    const link = screen.getByText('Unlinked item').closest('a');
    expect(link).toBeNull();
  });

  it('renders as li element for session type', () => {
    const { container } = render(<ActivityItem item={makeItem({ type: 'session' })} />);

    expect(container.querySelector('li')).toBeDefined();
  });

  it('renders as li element for achievement type', () => {
    const { container } = render(
      <ActivityItem
        item={makeItem({
          type: 'achievement',
          icon: 'Trophy',
          description: 'Earned a badge',
        })}
      />
    );

    expect(container.querySelector('li')).toBeDefined();
  });

  it('renders as li element for analysis type', () => {
    const { container } = render(
      <ActivityItem
        item={makeItem({
          type: 'analysis',
          icon: 'AlertTriangle',
          description: 'Risk alert',
        })}
      />
    );

    expect(container.querySelector('li')).toBeDefined();
  });

  it('applies session-type styling class', () => {
    const { container } = render(
      <ActivityItem item={makeItem({ type: 'session', icon: 'Clock' })} />
    );

    const iconContainer = container.querySelector('.bg-primary\\/10');
    expect(iconContainer).toBeDefined();
  });

  it('applies achievement-type styling class', () => {
    const { container } = render(
      <ActivityItem
        item={makeItem({ type: 'achievement', icon: 'Trophy' })}
      />
    );

    const iconContainer = container.querySelector('.bg-yellow-500\\/10');
    expect(iconContainer).toBeDefined();
  });

  it('applies analysis-type styling class', () => {
    const { container } = render(
      <ActivityItem
        item={makeItem({ type: 'analysis', icon: 'AlertTriangle' })}
      />
    );

    const iconContainer = container.querySelector('.bg-red-500\\/10');
    expect(iconContainer).toBeDefined();
  });

  it('renders the description and time together in the content area', () => {
    render(
      <ActivityItem
        item={makeItem({
          description: 'Test description',
          relativeTime: 'yesterday',
        })}
      />
    );

    expect(screen.getByText('Test description')).toBeDefined();
    expect(screen.getByText('yesterday')).toBeDefined();
  });
});
