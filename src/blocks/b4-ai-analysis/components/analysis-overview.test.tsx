import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock hooks BEFORE importing the component
// ---------------------------------------------------------------------------

vi.mock('../hooks/use-analysis', () => ({
  useLatestAnalyses: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
}));

vi.mock('../hooks/use-risk-summary', () => ({
  useRiskSummary: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

vi.mock('../hooks/use-weekly-report', () => ({
  useWeeklyReport: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

// Mock child components with simple stubs
vi.mock('./course-analysis-card', () => ({
  CourseAnalysisCard: ({ analysis }: any) => (
    <div data-testid={`course-card-${analysis.course_id}`}>{analysis.course_title}</div>
  ),
}));

vi.mock('./weekly-report-card', () => ({
  WeeklyReportCard: ({ report }: any) => (
    <div data-testid="weekly-report-card">Week of {report.week_start}</div>
  ),
}));

vi.mock('./risk-score-badge', () => ({
  RiskScoreBadge: ({ score, level }: any) => (
    <div data-testid="risk-badge" title={`Risk score: ${score}/100 (${level})`}>{score}</div>
  ),
}));

vi.mock('../lib/risk-calculator', () => ({
  riskLevelFromScore: (score: number) => {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  },
}));

// ---------------------------------------------------------------------------
// Import component & hooks after mocks
// ---------------------------------------------------------------------------

import { AnalysisOverview } from './analysis-overview';
import { useLatestAnalyses } from '../hooks/use-analysis';
import { useRiskSummary } from '../hooks/use-risk-summary';
import { useWeeklyReport } from '../hooks/use-weekly-report';
import type { RiskSummary, AnalysisWithCourse } from '../actions/analysis-actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnalysis(overrides: Partial<AnalysisWithCourse> = {}): AnalysisWithCourse {
  return {
    id: 'a-1',
    user_id: 'u-1',
    course_id: 'c-1',
    analysis_type: 'daily',
    risk_score: 45,
    risk_level: 'medium',
    insights: [],
    interventions: [],
    patterns: null,
    raw_prompt: null,
    raw_response: null,
    tokens_used: null,
    model: 'openai:gpt-4o',
    created_at: '2026-02-20T10:00:00Z',
    course_title: 'React Course',
    course_platform: 'udemy',
    ...overrides,
  };
}

function makeRiskSummary(overrides: Partial<RiskSummary> = {}): RiskSummary {
  return {
    totalCourses: 3,
    averageRisk: 40,
    riskDistribution: { low: 1, medium: 1, high: 1, critical: 0 },
    highestRiskCourse: {
      courseId: 'c-3',
      title: 'Machine Learning',
      riskScore: 72,
      riskLevel: 'high',
    },
    ...overrides,
  };
}

function makeWeeklyReport() {
  return {
    id: 'wr-1',
    user_id: 'u-1',
    week_start: '2026-02-16',
    week_end: '2026-02-22',
    total_minutes: 420,
    total_sessions: 12,
    total_modules: 8,
    courses_summary: null,
    ai_summary: 'Great progress this week!',
    highlights: null,
    recommendations: null,
    streak_length: 5,
    compared_to_previous: null,
    created_at: '2026-02-22T03:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalysisOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: everything loaded, no data
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);
    vi.mocked(useRiskSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);
  });

  it('renders the empty state when no analyses and no weekly report exist', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.getByText('No AI Analysis Yet')).toBeDefined();
    expect(screen.getByText(/AI analysis runs daily/)).toBeDefined();
  });

  it('does not show empty state while data is still loading', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.queryByText('No AI Analysis Yet')).toBeNull();
  });

  it('renders course analysis cards when analyses exist', () => {
    const analyses = [
      makeAnalysis({ course_id: 'c-1', course_title: 'React Course' }),
      makeAnalysis({ id: 'a-2', course_id: 'c-2', course_title: 'Node Course' }),
    ];
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: analyses,
      isLoading: false,
      error: null,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.getByTestId('course-card-c-1')).toBeDefined();
    expect(screen.getByTestId('course-card-c-2')).toBeDefined();
    expect(screen.getByText('Course Analysis')).toBeDefined();
  });

  it('renders the weekly report section when a report exists', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeWeeklyReport(),
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.getByText('Latest Weekly Report')).toBeDefined();
    expect(screen.getByTestId('weekly-report-card')).toBeDefined();
  });

  it('renders risk summary cards when risk summary data exists', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: [makeAnalysis()],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useRiskSummary).mockReturnValue({
      data: makeRiskSummary(),
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.getByText('Overall Risk')).toBeDefined();
    expect(screen.getByText('Risk Distribution')).toBeDefined();
    expect(screen.getByText('Highest Risk')).toBeDefined();
  });

  it('shows active course count in overall risk card', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: [makeAnalysis()],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useRiskSummary).mockReturnValue({
      data: makeRiskSummary({ totalCourses: 3 }),
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.getByText('3 active courses')).toBeDefined();
  });

  it('uses singular "course" when only one active course', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: [makeAnalysis()],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useRiskSummary).mockReturnValue({
      data: makeRiskSummary({ totalCourses: 1 }),
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.getByText('1 active course')).toBeDefined();
  });

  it('shows risk distribution values for all levels', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: [makeAnalysis()],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useRiskSummary).mockReturnValue({
      data: makeRiskSummary({
        riskDistribution: { low: 2, medium: 1, high: 3, critical: 0 },
      }),
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    // The four level labels should be visible
    expect(screen.getByText('low')).toBeDefined();
    expect(screen.getByText('medium')).toBeDefined();
    expect(screen.getByText('high')).toBeDefined();
    expect(screen.getByText('critical')).toBeDefined();
  });

  it('hides risk summary when totalCourses is 0', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: [makeAnalysis()],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useRiskSummary).mockReturnValue({
      data: makeRiskSummary({ totalCourses: 0 }),
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.queryByText('Overall Risk')).toBeNull();
  });

  it('shows empty state when analyses fail to load and no other data exists', () => {
    // When useLatestAnalyses returns an error with no data, and there is no weekly report,
    // the AnalysisOverview component shows the empty state because allLoaded=true and hasAnyData=false.
    // The error message from CourseAnalysesSection is only visible when the empty state is not shown.
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as any);
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.getByText('No AI Analysis Yet')).toBeDefined();
  });

  it('shows error message in course analyses section when analyses fail but weekly report exists', () => {
    // When a weekly report exists, the empty state is NOT shown, so the CourseAnalysesSection
    // renders its own error message.
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as any);
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeWeeklyReport(),
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.getByText('Failed to load analyses. Please try again.')).toBeDefined();
  });

  it('shows highest risk course title', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: [makeAnalysis()],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useRiskSummary).mockReturnValue({
      data: makeRiskSummary({
        highestRiskCourse: {
          courseId: 'c-3',
          title: 'Machine Learning',
          riskScore: 72,
          riskLevel: 'high',
        },
      }),
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.getByText('Machine Learning')).toBeDefined();
  });

  it('hides highest risk card when no highest risk course', () => {
    vi.mocked(useLatestAnalyses).mockReturnValue({
      data: [makeAnalysis()],
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useRiskSummary).mockReturnValue({
      data: makeRiskSummary({ highestRiskCourse: null }),
      isLoading: false,
    } as any);
    render(<AnalysisOverview />);
    expect(screen.queryByText('Highest Risk')).toBeNull();
  });
});
