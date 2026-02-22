import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock PlanCourseItem to isolate TodaysPlan
vi.mock('./plan-course-item', () => ({
  PlanCourseItem: ({ item }: { item: { title: string; courseId: string } }) => (
    <div data-testid={`plan-item-${item.courseId}`}>{item.title}</div>
  ),
}));

import { TodaysPlan } from './todays-plan';
import type { TodaysPlanData } from '../lib/dashboard-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makePlan(overrides: Partial<TodaysPlanData> = {}): TodaysPlanData {
  return {
    planItems: [],
    aiMessage: null,
    isAiGenerated: false,
    isStudyDay: true,
    ...overrides,
  };
}

function makePlanItem(id: string, title: string) {
  return {
    courseId: id,
    title,
    priority: 1,
    suggestedMinutes: 30,
    currentProgress: 50,
    riskLevel: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TodaysPlan', () => {
  it('renders plan items when present', () => {
    const plan = makePlan({
      planItems: [
        makePlanItem('c1', 'React 101'),
        makePlanItem('c2', 'Node Advanced'),
      ],
      isStudyDay: true,
    });

    render(<TodaysPlan plan={plan} />);

    expect(screen.getByText('React 101')).toBeDefined();
    expect(screen.getByText('Node Advanced')).toBeDefined();
  });

  it('shows rest day message with coffee icon text when not a study day', () => {
    const plan = makePlan({ isStudyDay: false });

    render(<TodaysPlan plan={plan} />);

    expect(screen.getByText(/Rest day/)).toBeDefined();
    expect(screen.getByText(/Take a break or do some light review/)).toBeDefined();
  });

  it('shows fallback text when study day but no active courses', () => {
    const plan = makePlan({ isStudyDay: true, planItems: [] });

    render(<TodaysPlan plan={plan} />);

    expect(screen.getByText(/No active courses to plan for/)).toBeDefined();
    expect(screen.getByText(/Add a course to get started/)).toBeDefined();
  });

  it('shows AI badge when plan is AI-generated', () => {
    const plan = makePlan({
      isAiGenerated: true,
      planItems: [makePlanItem('c1', 'React 101')],
    });

    render(<TodaysPlan plan={plan} />);

    expect(screen.getByText('AI')).toBeDefined();
  });

  it('does NOT show AI badge when plan is not AI-generated', () => {
    const plan = makePlan({
      isAiGenerated: false,
      planItems: [makePlanItem('c1', 'React 101')],
    });

    render(<TodaysPlan plan={plan} />);

    expect(screen.queryByText('AI')).toBeNull();
  });

  it('renders AI message when present', () => {
    const plan = makePlan({
      planItems: [makePlanItem('c1', 'React 101')],
      aiMessage: 'Focus on completing React hooks today.',
    });

    render(<TodaysPlan plan={plan} />);

    expect(screen.getByText('Focus on completing React hooks today.')).toBeDefined();
  });

  it('does NOT render AI message block when aiMessage is null', () => {
    const plan = makePlan({
      planItems: [makePlanItem('c1', 'React 101')],
      aiMessage: null,
    });

    render(<TodaysPlan plan={plan} />);

    // No AI message paragraph should be present
    expect(screen.queryByText('Focus on completing')).toBeNull();
  });

  it('renders header with "Today\'s Plan" title', () => {
    const plan = makePlan({
      planItems: [makePlanItem('c1', 'React 101')],
    });

    render(<TodaysPlan plan={plan} />);

    expect(screen.getByText("Today's Plan")).toBeDefined();
  });

  it('has View All link pointing to /reports/insights', () => {
    const plan = makePlan({
      planItems: [makePlanItem('c1', 'React 101')],
    });

    render(<TodaysPlan plan={plan} />);

    const viewAllLink = screen.getByText('View All');
    expect(viewAllLink.closest('a')?.getAttribute('href')).toBe('/reports/insights');
  });

  it('rest day takes priority over empty plan items', () => {
    // When isStudyDay is false, even if planItems are present the rest day message shows
    const plan = makePlan({ isStudyDay: false, planItems: [makePlanItem('c1', 'React')] });

    render(<TodaysPlan plan={plan} />);

    expect(screen.getByText(/Rest day/)).toBeDefined();
    // plan items should NOT render
    expect(screen.queryByTestId('plan-item-c1')).toBeNull();
  });
});
