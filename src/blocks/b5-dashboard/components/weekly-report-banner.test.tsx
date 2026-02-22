import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { WeeklyReportBanner } from './weekly-report-banner';
import type { WeeklyReport } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReport(overrides: Partial<WeeklyReport> = {}): WeeklyReport {
  return {
    id: 'wr-1',
    user_id: 'user-1',
    week_start: '2025-06-02',
    week_end: '2025-06-08',
    total_minutes: 360,
    total_sessions: 8,
    total_modules: 12,
    courses_summary: null,
    ai_summary: 'Great week of studying! You completed 12 modules.',
    highlights: ['Finished React hooks chapter', 'Maintained 5-day streak'],
    recommendations: null,
    streak_length: 5,
    compared_to_previous: {
      minutes_diff: 60,
      sessions_diff: 2,
      trend: 'up',
    },
    created_at: '2025-06-09T03:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('WeeklyReportBanner', () => {
  it('renders null-report fallback message', () => {
    render(<WeeklyReportBanner report={null} />);

    expect(
      screen.getByText(/Your first weekly report will be generated after a week of activity/)
    ).toBeDefined();
  });

  it('renders collapsed state with summary text', () => {
    const report = makeReport();

    render(<WeeklyReportBanner report={report} />);

    expect(screen.getByText('Weekly Report')).toBeDefined();
    // In collapsed state, shows ai_summary as line-clamp-1
    expect(screen.getByText(report.ai_summary!)).toBeDefined();
  });

  it('shows session/hours fallback when ai_summary is null in collapsed state', () => {
    const report = makeReport({ ai_summary: null });

    render(<WeeklyReportBanner report={report} />);

    // Fallback: "{total_sessions} sessions, {hours}h total"
    expect(screen.getByText('8 sessions, 6h total')).toBeDefined();
  });

  it('expands when expand button is clicked', () => {
    const report = makeReport();

    render(<WeeklyReportBanner report={report} />);

    // Click expand button
    const expandBtn = screen.getByRole('button', { name: /Expand weekly report/i });
    fireEvent.click(expandBtn);

    // Expanded content visible
    expect(screen.getByText('8 sessions')).toBeDefined();
    expect(screen.getByText('6h studied')).toBeDefined();
    expect(screen.getByText('12 modules')).toBeDefined();
  });

  it('shows highlights in expanded state', () => {
    const report = makeReport();

    render(<WeeklyReportBanner report={report} />);

    fireEvent.click(screen.getByRole('button', { name: /Expand weekly report/i }));

    expect(screen.getByText('Highlights')).toBeDefined();
    expect(screen.getByText('- Finished React hooks chapter')).toBeDefined();
    expect(screen.getByText('- Maintained 5-day streak')).toBeDefined();
  });

  it('shows positive trend comparison when trend is up', () => {
    const report = makeReport({
      compared_to_previous: { minutes_diff: 60, sessions_diff: 2, trend: 'up' },
    });

    render(<WeeklyReportBanner report={report} />);

    fireEvent.click(screen.getByRole('button', { name: /Expand weekly report/i }));

    expect(screen.getByText('+60m vs previous week')).toBeDefined();
  });

  it('shows negative trend comparison when trend is down', () => {
    const report = makeReport({
      compared_to_previous: { minutes_diff: -45, sessions_diff: -1, trend: 'down' },
    });

    render(<WeeklyReportBanner report={report} />);

    fireEvent.click(screen.getByRole('button', { name: /Expand weekly report/i }));

    expect(screen.getByText('-45m vs previous week')).toBeDefined();
  });

  it('shows stable comparison when trend is stable', () => {
    const report = makeReport({
      compared_to_previous: { minutes_diff: 0, sessions_diff: 0, trend: 'stable' },
    });

    render(<WeeklyReportBanner report={report} />);

    fireEvent.click(screen.getByRole('button', { name: /Expand weekly report/i }));

    expect(screen.getByText('Same as previous week')).toBeDefined();
  });

  it('collapses back when collapse button is clicked', () => {
    const report = makeReport();

    render(<WeeklyReportBanner report={report} />);

    // Expand
    fireEvent.click(screen.getByRole('button', { name: /Expand weekly report/i }));
    expect(screen.getByText('Highlights')).toBeDefined();

    // Collapse
    fireEvent.click(screen.getByRole('button', { name: /Collapse weekly report/i }));
    expect(screen.queryByText('Highlights')).toBeNull();
  });

  it('has "View Full Report" link in expanded state', () => {
    const report = makeReport();

    render(<WeeklyReportBanner report={report} />);

    fireEvent.click(screen.getByRole('button', { name: /Expand weekly report/i }));

    const link = screen.getByText('View Full Report');
    expect(link.closest('a')?.getAttribute('href')).toBe('/reports');
  });

  it('does NOT render highlights section when highlights is null', () => {
    const report = makeReport({ highlights: null });

    render(<WeeklyReportBanner report={report} />);

    fireEvent.click(screen.getByRole('button', { name: /Expand weekly report/i }));

    expect(screen.queryByText('Highlights')).toBeNull();
  });

  it('does NOT render highlights section when highlights array is empty', () => {
    const report = makeReport({ highlights: [] });

    render(<WeeklyReportBanner report={report} />);

    fireEvent.click(screen.getByRole('button', { name: /Expand weekly report/i }));

    expect(screen.queryByText('Highlights')).toBeNull();
  });
});
