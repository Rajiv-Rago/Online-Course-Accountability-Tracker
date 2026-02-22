import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock child components
vi.mock('./notification-type-icon', () => ({
  NotificationTypeIcon: ({ type }: { type: string }) => (
    <span data-testid={`type-icon-${type}`}>Icon</span>
  ),
  getTypeLabel: (type: string) => {
    const labels: Record<string, string> = {
      reminder: 'Reminders',
      risk_alert: 'Risk Alerts',
      achievement: 'Achievements',
      buddy_update: 'Buddy Updates',
      weekly_report: 'Weekly Reports',
      streak_warning: 'Streak Warnings',
    };
    return labels[type] ?? type;
  },
}));

import { NotificationFilters } from './notification-filters';

describe('NotificationFilters', () => {
  const onTypeChange = vi.fn();
  const onUnreadOnlyChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the type select trigger', () => {
    render(
      <NotificationFilters
        currentType={null}
        showUnreadOnly={false}
        onTypeChange={onTypeChange}
        onUnreadOnlyChange={onUnreadOnlyChange}
      />
    );
    // The select trigger should show "All Types" when currentType is null
    expect(screen.getByText('All Types')).toBeDefined();
  });

  it('renders the Unread Only label', () => {
    render(
      <NotificationFilters
        currentType={null}
        showUnreadOnly={false}
        onTypeChange={onTypeChange}
        onUnreadOnlyChange={onUnreadOnlyChange}
      />
    );
    expect(screen.getByText('Unread Only')).toBeDefined();
  });

  it('renders the switch for unread-only toggle', () => {
    render(
      <NotificationFilters
        currentType={null}
        showUnreadOnly={false}
        onTypeChange={onTypeChange}
        onUnreadOnlyChange={onUnreadOnlyChange}
      />
    );
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeDefined();
  });

  it('switch reflects showUnreadOnly=false', () => {
    render(
      <NotificationFilters
        currentType={null}
        showUnreadOnly={false}
        onTypeChange={onTypeChange}
        onUnreadOnlyChange={onUnreadOnlyChange}
      />
    );
    const switchEl = screen.getByRole('switch');
    expect(switchEl.getAttribute('data-state')).toBe('unchecked');
  });

  it('switch reflects showUnreadOnly=true', () => {
    render(
      <NotificationFilters
        currentType={null}
        showUnreadOnly={true}
        onTypeChange={onTypeChange}
        onUnreadOnlyChange={onUnreadOnlyChange}
      />
    );
    const switchEl = screen.getByRole('switch');
    expect(switchEl.getAttribute('data-state')).toBe('checked');
  });

  it('calls onUnreadOnlyChange when switch is clicked', () => {
    render(
      <NotificationFilters
        currentType={null}
        showUnreadOnly={false}
        onTypeChange={onTypeChange}
        onUnreadOnlyChange={onUnreadOnlyChange}
      />
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(onUnreadOnlyChange).toHaveBeenCalledWith(true);
  });

  it('renders the select combobox for type filter', () => {
    render(
      <NotificationFilters
        currentType={null}
        showUnreadOnly={false}
        onTypeChange={onTypeChange}
        onUnreadOnlyChange={onUnreadOnlyChange}
      />
    );
    expect(screen.getByRole('combobox')).toBeDefined();
  });
});
