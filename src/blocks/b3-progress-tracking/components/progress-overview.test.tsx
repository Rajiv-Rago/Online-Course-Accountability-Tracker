import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/link to render as a simple anchor
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock all child components to isolate ProgressOverview
vi.mock('./streak-display', () => ({
  StreakDisplay: () => <div data-testid="streak-display">Streak Display</div>,
}));

vi.mock('./daily-stats-summary', () => ({
  DailyStatsSummary: () => <div data-testid="daily-stats-summary">Daily Stats Summary</div>,
}));

vi.mock('./weekly-stats-summary', () => ({
  WeeklyStatsSummary: () => <div data-testid="weekly-stats-summary">Weekly Stats Summary</div>,
}));

vi.mock('./session-list', () => ({
  SessionList: () => <div data-testid="session-list">Session List</div>,
}));

import { ProgressOverview } from './progress-overview';

describe('ProgressOverview', () => {
  it('renders the "Progress Overview" heading', () => {
    render(<ProgressOverview />);
    expect(screen.getByText('Progress Overview')).toBeDefined();
  });

  it('renders StreakDisplay component', () => {
    render(<ProgressOverview />);
    expect(screen.getByTestId('streak-display')).toBeDefined();
  });

  it('renders DailyStatsSummary component', () => {
    render(<ProgressOverview />);
    expect(screen.getByTestId('daily-stats-summary')).toBeDefined();
  });

  it('renders WeeklyStatsSummary component', () => {
    render(<ProgressOverview />);
    expect(screen.getByTestId('weekly-stats-summary')).toBeDefined();
  });

  it('renders SessionList component', () => {
    render(<ProgressOverview />);
    expect(screen.getByTestId('session-list')).toBeDefined();
  });

  it('renders "Recent Sessions" section heading', () => {
    render(<ProgressOverview />);
    expect(screen.getByText('Recent Sessions')).toBeDefined();
  });

  it('renders "Log Session" link', () => {
    render(<ProgressOverview />);
    expect(screen.getByText('Log Session')).toBeDefined();
  });

  it('renders "Start Timer" link', () => {
    render(<ProgressOverview />);
    expect(screen.getByText('Start Timer')).toBeDefined();
  });

  it('has Log Session link pointing to /progress/log', () => {
    render(<ProgressOverview />);
    const logLink = screen.getByText('Log Session').closest('a');
    expect(logLink?.getAttribute('href')).toBe('/progress/log');
  });

  it('has Start Timer link pointing to /progress/timer', () => {
    render(<ProgressOverview />);
    const timerLink = screen.getByText('Start Timer').closest('a');
    expect(timerLink?.getAttribute('href')).toBe('/progress/timer');
  });
});
