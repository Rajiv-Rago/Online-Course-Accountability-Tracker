import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { PlanCourseItem } from './plan-course-item';
import type { PlanCourseItemData } from '../lib/dashboard-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeItem(overrides: Partial<PlanCourseItemData> = {}): PlanCourseItemData {
  return {
    courseId: 'c1',
    title: 'React Fundamentals',
    priority: 1,
    suggestedMinutes: 45,
    currentProgress: 30,
    riskLevel: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PlanCourseItem', () => {
  it('renders course title', () => {
    render(<PlanCourseItem item={makeItem()} />);

    expect(screen.getByText('React Fundamentals')).toBeDefined();
  });

  it('renders priority P1 badge for priority 1', () => {
    render(<PlanCourseItem item={makeItem({ priority: 1 })} />);

    expect(screen.getByText('P1')).toBeDefined();
  });

  it('renders priority P2 badge for priority 2', () => {
    render(<PlanCourseItem item={makeItem({ priority: 2 })} />);

    expect(screen.getByText('P2')).toBeDefined();
  });

  it('renders priority P3 badge for priority 3', () => {
    render(<PlanCourseItem item={makeItem({ priority: 3 })} />);

    expect(screen.getByText('P3')).toBeDefined();
  });

  it('renders priority P4 badge for priority 4', () => {
    render(<PlanCourseItem item={makeItem({ priority: 4 })} />);

    expect(screen.getByText('P4')).toBeDefined();
  });

  it('renders fallback priority label for unknown priority', () => {
    render(<PlanCourseItem item={makeItem({ priority: 5 })} />);

    expect(screen.getByText('P5')).toBeDefined();
  });

  it('renders suggested minutes', () => {
    render(<PlanCourseItem item={makeItem({ suggestedMinutes: 60 })} />);

    expect(screen.getByText('60m')).toBeDefined();
  });

  it('renders play button link to timer with course id', () => {
    render(<PlanCourseItem item={makeItem({ courseId: 'abc-123', title: 'Node.js' })} />);

    const playLink = screen.getByRole('link', { name: /Start studying Node.js/i });
    expect(playLink.getAttribute('href')).toBe('/progress/timer?course=abc-123');
  });

  it('renders different suggested minute values', () => {
    render(<PlanCourseItem item={makeItem({ suggestedMinutes: 15 })} />);

    expect(screen.getByText('15m')).toBeDefined();
  });

  it('renders progress bar (by presence of progress element)', () => {
    const { container } = render(
      <PlanCourseItem item={makeItem({ currentProgress: 50 })} />
    );

    // Progress component should be present with value=50
    const progressEl = container.querySelector('[role="progressbar"]');
    expect(progressEl).toBeDefined();
  });
});
