import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- CourseStatusBadge ---
import { CourseStatusBadge } from './course-status-badge';

describe('CourseStatusBadge', () => {
  it('renders formatted status text for "in_progress"', () => {
    render(<CourseStatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeDefined();
  });

  it('renders formatted status text for "not_started"', () => {
    render(<CourseStatusBadge status="not_started" />);
    expect(screen.getByText('Not Started')).toBeDefined();
  });

  it('renders formatted status text for "completed"', () => {
    render(<CourseStatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('renders formatted status text for "paused"', () => {
    render(<CourseStatusBadge status="paused" />);
    expect(screen.getByText('Paused')).toBeDefined();
  });

  it('renders formatted status text for "abandoned"', () => {
    render(<CourseStatusBadge status="abandoned" />);
    expect(screen.getByText('Abandoned')).toBeDefined();
  });
});

// --- CoursePriorityBadge ---
import { CoursePriorityBadge } from './course-priority-badge';

describe('CoursePriorityBadge', () => {
  it('renders P1 for priority 1', () => {
    render(<CoursePriorityBadge priority={1} />);
    expect(screen.getByText('P1')).toBeDefined();
  });

  it('renders P2 for priority 2', () => {
    render(<CoursePriorityBadge priority={2} />);
    expect(screen.getByText('P2')).toBeDefined();
  });

  it('renders P3 for priority 3', () => {
    render(<CoursePriorityBadge priority={3} />);
    expect(screen.getByText('P3')).toBeDefined();
  });

  it('renders P4 for priority 4', () => {
    render(<CoursePriorityBadge priority={4} />);
    expect(screen.getByText('P4')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<CoursePriorityBadge priority={1} className="custom-class" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('custom-class');
  });
});

// --- PlatformIcon ---
import { PlatformIcon } from './platform-icon';

describe('PlatformIcon', () => {
  it('renders without crashing for udemy platform', () => {
    const { container } = render(<PlatformIcon platform="udemy" />);
    expect(container.firstElementChild).toBeDefined();
  });

  it('renders without crashing for null platform', () => {
    const { container } = render(<PlatformIcon platform={null} />);
    expect(container.firstElementChild).toBeDefined();
  });

  it('renders with custom size', () => {
    const { container } = render(<PlatformIcon platform="youtube" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('renders for all valid platforms without error', () => {
    const platforms = ['udemy', 'coursera', 'youtube', 'skillshare', 'pluralsight', 'custom'] as const;
    platforms.forEach((platform) => {
      const { container } = render(<PlatformIcon platform={platform} />);
      expect(container.firstElementChild).toBeDefined();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<PlatformIcon platform="udemy" className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal || svg?.getAttribute('class')).toContain('test-class');
  });
});

// --- CourseProgressBar ---
import { CourseProgressBar } from './course-progress-bar';

describe('CourseProgressBar', () => {
  it('renders progress label by default', () => {
    render(<CourseProgressBar value={50} />);
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('hides label when showLabel is false', () => {
    render(<CourseProgressBar value={50} showLabel={false} />);
    expect(screen.queryByText('50%')).toBeNull();
  });

  it('clamps value to 0 minimum', () => {
    render(<CourseProgressBar value={-10} />);
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('clamps value to 100 maximum', () => {
    render(<CourseProgressBar value={150} />);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('renders 0% for zero value', () => {
    render(<CourseProgressBar value={0} />);
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('renders 100% for full value', () => {
    render(<CourseProgressBar value={100} />);
    expect(screen.getByText('100%')).toBeDefined();
  });
});

// --- DaysRemainingBadge ---
import { DaysRemainingBadge } from './days-remaining-badge';

describe('DaysRemainingBadge', () => {
  it('shows "No target set" when targetDate is null', () => {
    render(<DaysRemainingBadge targetDate={null} />);
    expect(screen.getByText('No target set')).toBeDefined();
  });

  it('shows overdue text when target date is in the past', () => {
    render(<DaysRemainingBadge targetDate="2020-01-01" />);
    expect(screen.getByText(/days overdue/)).toBeDefined();
  });

  it('shows days left for a future target date', () => {
    // Use a date far in the future to ensure it is always > 7 days
    render(<DaysRemainingBadge targetDate="2030-12-31" />);
    expect(screen.getByText(/days left/)).toBeDefined();
  });

  it('shows warning style for dates within 7 days', () => {
    // Compute a date 3 days from now
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const dateStr = future.toISOString().split('T')[0];

    render(<DaysRemainingBadge targetDate={dateStr} />);
    expect(screen.getByText(/days left/)).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<DaysRemainingBadge targetDate={null} className="my-class" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain('my-class');
  });
});
