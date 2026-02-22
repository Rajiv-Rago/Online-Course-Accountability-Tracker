import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock next/link (used by WeeklyReportCard)
// ---------------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ---------------------------------------------------------------------------
// Import components (these are leaf components, no hooks to mock)
// ---------------------------------------------------------------------------

import { InsightCard } from './insight-card';
import { PatternDisplay } from './pattern-display';
import { WeeklyReportCard } from './weekly-report-card';
import { InterventionCard } from './intervention-card';
import type { AiInsight, AiPatterns, WeeklyReport, AiIntervention } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInsight(overrides: Partial<AiInsight> = {}): AiInsight {
  return {
    type: 'positive',
    title: 'Great work',
    description: 'You studied consistently this week.',
    confidence: 0.85,
    ...overrides,
  };
}

function makePatterns(overrides: Partial<AiPatterns> = {}): AiPatterns {
  return {
    optimal_time: '18:00-19:00',
    avg_session_length: 45,
    consistency_score: 0.72,
    preferred_day: 'Wednesday',
    ...overrides,
  };
}

function makeWeeklyReport(overrides: Partial<WeeklyReport> = {}): WeeklyReport {
  return {
    id: 'wr-1',
    user_id: 'u-1',
    week_start: '2026-02-16',
    week_end: '2026-02-22',
    total_minutes: 420,
    total_sessions: 12,
    total_modules: 8,
    courses_summary: null,
    ai_summary: null,
    highlights: null,
    recommendations: null,
    streak_length: 5,
    compared_to_previous: null,
    created_at: '2026-02-22T03:00:00Z',
    ...overrides,
  };
}

function makeIntervention(overrides: Partial<AiIntervention> = {}): AiIntervention {
  return {
    type: 'action',
    message: 'Review the fundamentals chapter again.',
    priority: 'medium',
    action_url: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// InsightCard Tests
// ---------------------------------------------------------------------------

describe('InsightCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders insight title and description', () => {
    render(<InsightCard insight={makeInsight()} />);
    expect(screen.getByText('Great work')).toBeDefined();
    expect(screen.getByText('You studied consistently this week.')).toBeDefined();
  });

  it('displays confidence as percentage', () => {
    render(<InsightCard insight={makeInsight({ confidence: 0.92 })} />);
    expect(screen.getByText('92%')).toBeDefined();
  });

  it('rounds confidence percentage', () => {
    render(<InsightCard insight={makeInsight({ confidence: 0.876 })} />);
    expect(screen.getByText('88%')).toBeDefined();
  });

  it('renders "+" icon for positive type', () => {
    render(<InsightCard insight={makeInsight({ type: 'positive' })} />);
    expect(screen.getByText('+')).toBeDefined();
  });

  it('renders "!" icon for warning type', () => {
    render(<InsightCard insight={makeInsight({ type: 'warning' })} />);
    expect(screen.getByText('!')).toBeDefined();
  });

  it('renders "?" icon for suggestion type', () => {
    render(<InsightCard insight={makeInsight({ type: 'suggestion' })} />);
    expect(screen.getByText('?')).toBeDefined();
  });

  it('renders "-" icon for neutral type', () => {
    render(<InsightCard insight={makeInsight({ type: 'neutral' })} />);
    expect(screen.getByText('-')).toBeDefined();
  });

  it('applies green border class for positive type', () => {
    const { container } = render(<InsightCard insight={makeInsight({ type: 'positive' })} />);
    const card = container.querySelector('.border-l-4');
    expect(card?.className).toContain('border-l-green-500');
  });

  it('applies yellow border class for warning type', () => {
    const { container } = render(<InsightCard insight={makeInsight({ type: 'warning' })} />);
    const card = container.querySelector('.border-l-4');
    expect(card?.className).toContain('border-l-yellow-500');
  });
});

// ---------------------------------------------------------------------------
// PatternDisplay Tests
// ---------------------------------------------------------------------------

describe('PatternDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Study Patterns" heading', () => {
    render(<PatternDisplay patterns={makePatterns()} />);
    expect(screen.getByText('Study Patterns')).toBeDefined();
  });

  it('renders optimal study time when set', () => {
    render(<PatternDisplay patterns={makePatterns({ optimal_time: '18:00-19:00' })} />);
    expect(screen.getByText('Best study time')).toBeDefined();
    expect(screen.getByText('18:00-19:00')).toBeDefined();
  });

  it('renders average session length in minutes', () => {
    render(<PatternDisplay patterns={makePatterns({ avg_session_length: 45 })} />);
    expect(screen.getByText('Avg session length')).toBeDefined();
    expect(screen.getByText('45 min')).toBeDefined();
  });

  it('rounds average session length', () => {
    render(<PatternDisplay patterns={makePatterns({ avg_session_length: 32.7 })} />);
    expect(screen.getByText('33 min')).toBeDefined();
  });

  it('renders consistency score as percentage', () => {
    render(<PatternDisplay patterns={makePatterns({ consistency_score: 0.72 })} />);
    expect(screen.getByText('Consistency')).toBeDefined();
    expect(screen.getByText('72%')).toBeDefined();
  });

  it('renders preferred day when set', () => {
    render(<PatternDisplay patterns={makePatterns({ preferred_day: 'Wednesday' })} />);
    expect(screen.getByText('Preferred day')).toBeDefined();
    expect(screen.getByText('Wednesday')).toBeDefined();
  });

  it('omits optimal time when null', () => {
    render(<PatternDisplay patterns={makePatterns({ optimal_time: null })} />);
    expect(screen.queryByText('Best study time')).toBeNull();
  });

  it('omits preferred day when null', () => {
    render(<PatternDisplay patterns={makePatterns({ preferred_day: null })} />);
    expect(screen.queryByText('Preferred day')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// WeeklyReportCard Tests
// ---------------------------------------------------------------------------

describe('WeeklyReportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders week start date', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({ week_start: '2026-02-16' })} />);
    expect(screen.getByText('Week of 2026-02-16')).toBeDefined();
  });

  it('renders study time in hours', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({ total_minutes: 420 })} />);
    expect(screen.getByText('7h')).toBeDefined();
    expect(screen.getByText('Study time')).toBeDefined();
  });

  it('renders session count', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({ total_sessions: 12 })} />);
    expect(screen.getByText('12')).toBeDefined();
    // "Sessions" label
    expect(screen.getByText('Sessions')).toBeDefined();
  });

  it('renders streak length with "d" suffix', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({ streak_length: 5 })} />);
    expect(screen.getByText('5d')).toBeDefined();
    expect(screen.getByText('Streak')).toBeDefined();
  });

  it('shows "Trending up" badge when trend is up', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({
      compared_to_previous: { minutes_diff: 60, sessions_diff: 3, trend: 'up' },
    })} />);
    expect(screen.getByText('Trending up')).toBeDefined();
  });

  it('shows "Trending down" badge when trend is down', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({
      compared_to_previous: { minutes_diff: -30, sessions_diff: -1, trend: 'down' },
    })} />);
    expect(screen.getByText('Trending down')).toBeDefined();
  });

  it('shows "Stable" badge when trend is stable', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({
      compared_to_previous: { minutes_diff: 0, sessions_diff: 0, trend: 'stable' },
    })} />);
    expect(screen.getByText('Stable')).toBeDefined();
  });

  it('does not show trend badge when no comparison data', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({ compared_to_previous: null })} />);
    expect(screen.queryByText('Trending up')).toBeNull();
    expect(screen.queryByText('Trending down')).toBeNull();
    expect(screen.queryByText('Stable')).toBeNull();
  });

  it('renders AI summary when available', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({ ai_summary: 'Excellent week of study.' })} />);
    expect(screen.getByText('Excellent week of study.')).toBeDefined();
  });

  it('does not render AI summary when null', () => {
    render(<WeeklyReportCard report={makeWeeklyReport({ ai_summary: null })} />);
    expect(screen.queryByText('Excellent week of study.')).toBeNull();
  });

  it('links to the weekly analysis page', () => {
    const { container } = render(<WeeklyReportCard report={makeWeeklyReport()} />);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/analysis/weekly');
  });
});

// ---------------------------------------------------------------------------
// InterventionCard Tests
// ---------------------------------------------------------------------------

describe('InterventionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the intervention message', () => {
    render(<InterventionCard intervention={makeIntervention({ message: 'Review the fundamentals chapter again.' })} />);
    expect(screen.getByText('Review the fundamentals chapter again.')).toBeDefined();
  });

  it('renders the intervention type as a badge', () => {
    render(<InterventionCard intervention={makeIntervention({ type: 'encouragement' })} />);
    expect(screen.getByText('encouragement')).toBeDefined();
  });

  it('renders priority text', () => {
    render(<InterventionCard intervention={makeIntervention({ priority: 'high' })} />);
    expect(screen.getByText('high priority')).toBeDefined();
  });

  it('renders low priority text', () => {
    render(<InterventionCard intervention={makeIntervention({ priority: 'low' })} />);
    expect(screen.getByText('low priority')).toBeDefined();
  });

  it('renders "Take action" link when action_url is a valid HTTP URL', () => {
    render(<InterventionCard intervention={makeIntervention({ action_url: 'https://example.com/study' })} />);
    const link = screen.getByText('Take action');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('https://example.com/study');
  });

  it('does not render "Take action" link when action_url is null', () => {
    render(<InterventionCard intervention={makeIntervention({ action_url: null })} />);
    expect(screen.queryByText('Take action')).toBeNull();
  });

  it('does not render "Take action" link when action_url does not start with http', () => {
    render(<InterventionCard intervention={makeIntervention({ action_url: '/internal/path' })} />);
    expect(screen.queryByText('Take action')).toBeNull();
  });

  it('applies green dot for low priority', () => {
    const { container } = render(<InterventionCard intervention={makeIntervention({ priority: 'low' })} />);
    const dot = container.querySelector('.rounded-full');
    expect(dot?.className).toContain('bg-green-500');
  });

  it('applies yellow dot for medium priority', () => {
    const { container } = render(<InterventionCard intervention={makeIntervention({ priority: 'medium' })} />);
    const dot = container.querySelector('.rounded-full');
    expect(dot?.className).toContain('bg-yellow-500');
  });

  it('applies red dot for high priority', () => {
    const { container } = render(<InterventionCard intervention={makeIntervention({ priority: 'high' })} />);
    const dot = container.querySelector('.rounded-full');
    expect(dot?.className).toContain('bg-red-500');
  });
});
