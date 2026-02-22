import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ─── NotificationTypeIcon Tests ─────────────────────────────────────────────

// We test the real component, so we do NOT mock it
import { NotificationTypeIcon, getTypeLabel, getTypeBorderColor } from './notification-type-icon';

describe('NotificationTypeIcon', () => {
  it('renders without error for "reminder" type', () => {
    const { container } = render(<NotificationTypeIcon type="reminder" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('renders without error for "risk_alert" type', () => {
    const { container } = render(<NotificationTypeIcon type="risk_alert" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('renders without error for "achievement" type', () => {
    const { container } = render(<NotificationTypeIcon type="achievement" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <NotificationTypeIcon type="reminder" className="h-8 w-8" />
    );
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('h-8')).toBe(true);
    expect(svg?.classList.contains('w-8')).toBe(true);
  });

  it('falls back to reminder config for unknown type', () => {
    const { container } = render(<NotificationTypeIcon type="unknown_type" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    // Should have the blue color class (reminder default)
    expect(svg?.classList.contains('text-blue-500')).toBe(true);
  });
});

describe('getTypeLabel', () => {
  it('returns correct label for each known type', () => {
    expect(getTypeLabel('reminder')).toBe('Reminders');
    expect(getTypeLabel('risk_alert')).toBe('Risk Alerts');
    expect(getTypeLabel('achievement')).toBe('Achievements');
    expect(getTypeLabel('buddy_update')).toBe('Buddy Updates');
    expect(getTypeLabel('weekly_report')).toBe('Weekly Reports');
    expect(getTypeLabel('streak_warning')).toBe('Streak Warnings');
  });

  it('returns the raw type string for unknown types', () => {
    expect(getTypeLabel('unknown')).toBe('unknown');
  });
});

describe('getTypeBorderColor', () => {
  it('returns correct border color for each known type', () => {
    expect(getTypeBorderColor('reminder')).toBe('border-l-blue-500');
    expect(getTypeBorderColor('risk_alert')).toBe('border-l-red-500');
    expect(getTypeBorderColor('achievement')).toBe('border-l-yellow-500');
    expect(getTypeBorderColor('buddy_update')).toBe('border-l-green-500');
    expect(getTypeBorderColor('weekly_report')).toBe('border-l-purple-500');
    expect(getTypeBorderColor('streak_warning')).toBe('border-l-orange-500');
  });

  it('returns fallback color for unknown types', () => {
    expect(getTypeBorderColor('unknown')).toBe('border-l-muted-foreground');
  });
});

// ─── EmptyNotifications Tests ───────────────────────────────────────────────

import { EmptyNotifications } from './empty-notifications';

describe('EmptyNotifications', () => {
  it('shows "all caught up" message when no filters are applied', () => {
    render(<EmptyNotifications hasFiltersApplied={false} />);
    expect(screen.getByText("You're all caught up!")).toBeDefined();
    expect(screen.getByText('No notifications yet.')).toBeDefined();
  });

  it('shows filter-related message when filters are applied', () => {
    render(<EmptyNotifications hasFiltersApplied={true} />);
    expect(screen.getByText('No notifications match your current filters')).toBeDefined();
    expect(screen.getByText('Try adjusting or clearing your filters.')).toBeDefined();
  });
});

// ─── ReminderItem Tests ─────────────────────────────────────────────────────

vi.mock('./notification-utils', () => ({
  formatDays: (days: string[]) => days.join(', '),
  formatTime24to12: (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  },
}));

import { ReminderItem } from './reminder-item';
import type { ReminderWithCourse } from '../actions/reminder-actions';

const mockReminder: ReminderWithCourse = {
  id: 'r-1',
  user_id: 'u-1',
  course_id: 'c-1',
  days_of_week: ['mon', 'wed', 'fri'],
  time: '14:30',
  timezone: 'UTC',
  enabled: true,
  channels: ['in_app', 'email'],
  created_at: '2026-02-10T00:00:00Z',
  updated_at: '2026-02-10T00:00:00Z',
  course_title: 'React Fundamentals',
};

describe('ReminderItem', () => {
  const onToggle = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the course title', () => {
    render(
      <ReminderItem reminder={mockReminder} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    expect(screen.getByText('React Fundamentals')).toBeDefined();
  });

  it('renders "General Reminder" when course_title is null', () => {
    const reminder = { ...mockReminder, course_title: null };
    render(
      <ReminderItem reminder={reminder} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    expect(screen.getByText('General Reminder')).toBeDefined();
  });

  it('renders formatted days and time', () => {
    render(
      <ReminderItem reminder={mockReminder} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    // formatDays returns "mon, wed, fri", formatTime24to12 returns "2:30 PM"
    expect(screen.getByText(/mon, wed, fri/)).toBeDefined();
    expect(screen.getByText(/2:30 PM/)).toBeDefined();
  });

  it('renders channel badges', () => {
    render(
      <ReminderItem reminder={mockReminder} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    expect(screen.getByText('in-app')).toBeDefined();
    expect(screen.getByText('email')).toBeDefined();
  });

  it('renders the toggle switch', () => {
    render(
      <ReminderItem reminder={mockReminder} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeDefined();
    expect(switchEl.getAttribute('data-state')).toBe('checked');
  });

  it('calls onToggle when switch is clicked', () => {
    render(
      <ReminderItem reminder={mockReminder} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith('r-1', false);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <ReminderItem reminder={mockReminder} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByLabelText('Edit reminder'));
    expect(onEdit).toHaveBeenCalledWith(mockReminder);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <ReminderItem reminder={mockReminder} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByLabelText('Delete reminder'));
    expect(onDelete).toHaveBeenCalledWith('r-1');
  });

  it('shows disable aria-label when reminder is enabled', () => {
    render(
      <ReminderItem reminder={mockReminder} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    expect(screen.getByLabelText('Disable reminder for React Fundamentals')).toBeDefined();
  });

  it('shows enable aria-label when reminder is disabled', () => {
    const disabled = { ...mockReminder, enabled: false };
    render(
      <ReminderItem reminder={disabled} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    );
    expect(screen.getByLabelText('Enable reminder for React Fundamentals')).toBeDefined();
  });
});
