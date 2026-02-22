import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock next/link BEFORE importing
// ---------------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ---------------------------------------------------------------------------
// Mock child components BEFORE importing
// ---------------------------------------------------------------------------

vi.mock('./risk-score-badge', () => ({
  RiskScoreBadge: ({ score, level }: any) => (
    <div data-testid="risk-badge">{score} ({level})</div>
  ),
}));

vi.mock('./risk-level-indicator', () => ({
  RiskLevelIndicator: ({ level }: any) => (
    <div data-testid="risk-indicator">{level} risk</div>
  ),
}));

vi.mock('./insight-list', () => ({
  InsightList: ({ insights, maxVisible }: any) => (
    <div data-testid="insight-list">{insights.length} insights (max {maxVisible})</div>
  ),
}));

vi.mock('./intervention-card', () => ({
  InterventionCard: ({ intervention }: any) => (
    <div data-testid="intervention-card">{intervention.message}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import { CourseAnalysisCard } from './course-analysis-card';
import type { AnalysisWithCourse } from '../actions/analysis-actions';

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
    course_title: 'React Fundamentals',
    course_platform: 'udemy',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CourseAnalysisCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the course title as a link', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ course_id: 'c-42', course_title: 'Advanced TypeScript' })} />);
    const link = screen.getByText('Advanced TypeScript').closest('a');
    expect(link).toBeDefined();
    expect(link?.getAttribute('href')).toBe('/analysis/c-42');
  });

  it('renders the course platform', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ course_platform: 'coursera' })} />);
    expect(screen.getByText('coursera')).toBeDefined();
  });

  it('does not render platform text when course_platform is null', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ course_platform: null })} />);
    expect(screen.queryByText('udemy')).toBeNull();
    expect(screen.queryByText('coursera')).toBeNull();
  });

  it('renders the risk score badge when risk data exists', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ risk_score: 72, risk_level: 'high' })} />);
    expect(screen.getByTestId('risk-badge')).toBeDefined();
    expect(screen.getByText('72 (high)')).toBeDefined();
  });

  it('renders the risk level indicator when risk_level exists', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ risk_level: 'critical' })} />);
    expect(screen.getByTestId('risk-indicator')).toBeDefined();
    expect(screen.getByText('critical risk')).toBeDefined();
  });

  it('does not render risk badge when risk_score is null', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ risk_score: null, risk_level: null })} />);
    expect(screen.queryByTestId('risk-badge')).toBeNull();
  });

  it('does not render risk level indicator when risk_level is null', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ risk_level: null })} />);
    expect(screen.queryByTestId('risk-indicator')).toBeNull();
  });

  it('renders insight list when insights exist', () => {
    const insights = [
      { type: 'positive' as const, title: 'Great work', description: 'Consistent', confidence: 0.9 },
      { type: 'warning' as const, title: 'Slow progress', description: 'Behind pace', confidence: 0.8 },
      { type: 'suggestion' as const, title: 'Try mornings', description: 'Better focus', confidence: 0.7 },
    ];
    render(<CourseAnalysisCard analysis={makeAnalysis({ insights })} />);
    expect(screen.getByTestId('insight-list')).toBeDefined();
    expect(screen.getByText('3 insights (max 2)')).toBeDefined();
  });

  it('does not render insight list when no insights', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ insights: [] })} />);
    expect(screen.queryByTestId('insight-list')).toBeNull();
  });

  it('renders intervention cards with "Recommended Actions" heading', () => {
    const interventions = [
      { type: 'action' as const, message: 'Review chapter 5', priority: 'high' as const, action_url: null },
      { type: 'reminder' as const, message: 'Schedule study time', priority: 'medium' as const, action_url: null },
    ];
    render(<CourseAnalysisCard analysis={makeAnalysis({ interventions })} />);
    expect(screen.getByText('Recommended Actions')).toBeDefined();
    expect(screen.getByText('Review chapter 5')).toBeDefined();
    expect(screen.getByText('Schedule study time')).toBeDefined();
  });

  it('limits displayed interventions to 2', () => {
    const interventions = [
      { type: 'action' as const, message: 'Action 1', priority: 'high' as const, action_url: null },
      { type: 'action' as const, message: 'Action 2', priority: 'medium' as const, action_url: null },
      { type: 'reminder' as const, message: 'Action 3', priority: 'low' as const, action_url: null },
    ];
    render(<CourseAnalysisCard analysis={makeAnalysis({ interventions })} />);
    expect(screen.getByText('Action 1')).toBeDefined();
    expect(screen.getByText('Action 2')).toBeDefined();
    expect(screen.queryByText('Action 3')).toBeNull();
  });

  it('does not render interventions section when no interventions', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ interventions: [] })} />);
    expect(screen.queryByText('Recommended Actions')).toBeNull();
  });

  it('renders "View full analysis" link pointing to course analysis page', () => {
    render(<CourseAnalysisCard analysis={makeAnalysis({ course_id: 'c-99' })} />);
    const link = screen.getByText('View full analysis');
    expect(link.closest('a')?.getAttribute('href')).toBe('/analysis/c-99');
  });
});
