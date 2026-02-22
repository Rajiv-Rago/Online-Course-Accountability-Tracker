import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock child components BEFORE importing the component
// ---------------------------------------------------------------------------

vi.mock('./risk-score-badge', () => ({
  RiskScoreBadge: ({ score, level }: any) => (
    <div data-testid="risk-badge">{score} ({level})</div>
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

vi.mock('./pattern-display', () => ({
  PatternDisplay: ({ patterns }: any) => (
    <div data-testid="pattern-display">Patterns: {patterns.consistency_score}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import { AnalysisHistory } from './analysis-history';
import type { AiAnalysis } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnalysis(overrides: Partial<AiAnalysis> = {}): AiAnalysis {
  return {
    id: 'a-1',
    user_id: 'u-1',
    course_id: 'c-1',
    analysis_type: 'daily',
    risk_score: 40,
    risk_level: 'medium',
    insights: [],
    interventions: [],
    patterns: null,
    raw_prompt: null,
    raw_response: null,
    tokens_used: null,
    model: 'openai:gpt-4o',
    created_at: '2026-02-20T10:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalysisHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when analyses array is empty', () => {
    render(<AnalysisHistory analyses={[]} />);
    expect(screen.getByText('No analysis history yet. Analysis runs daily for active courses.')).toBeDefined();
  });

  it('renders timeline entries for each analysis', () => {
    const analyses = [
      makeAnalysis({ id: 'a-1', created_at: '2026-02-20T10:00:00Z' }),
      makeAnalysis({ id: 'a-2', created_at: '2026-02-19T10:00:00Z' }),
    ];
    render(<AnalysisHistory analyses={analyses} />);
    expect(screen.getByText('Feb 20, 2026')).toBeDefined();
    expect(screen.getByText('Feb 19, 2026')).toBeDefined();
  });

  it('shows risk score badge for entries with risk data', () => {
    const analyses = [makeAnalysis({ risk_score: 65, risk_level: 'high' })];
    render(<AnalysisHistory analyses={analyses} />);
    expect(screen.getByTestId('risk-badge')).toBeDefined();
    expect(screen.getByText('65 (high)')).toBeDefined();
  });

  it('shows Expand text on collapsed entries', () => {
    render(<AnalysisHistory analyses={[makeAnalysis()]} />);
    expect(screen.getByText('Expand')).toBeDefined();
    expect(screen.queryByText('Collapse')).toBeNull();
  });

  it('expands entry when clicked, showing Collapse text', () => {
    render(<AnalysisHistory analyses={[makeAnalysis({ insights: [{ type: 'positive', title: 'Good', description: 'Well done', confidence: 0.9 }] })]} />);
    fireEvent.click(screen.getByText('Expand'));
    expect(screen.getByText('Collapse')).toBeDefined();
    expect(screen.getByTestId('insight-list')).toBeDefined();
  });

  it('collapses expanded entry when clicked again', () => {
    render(<AnalysisHistory analyses={[makeAnalysis({ insights: [{ type: 'positive', title: 'Good', description: 'Well done', confidence: 0.9 }] })]} />);
    fireEvent.click(screen.getByText('Expand'));
    expect(screen.getByText('Collapse')).toBeDefined();
    fireEvent.click(screen.getByText('Collapse'));
    expect(screen.getByText('Expand')).toBeDefined();
    expect(screen.queryByTestId('insight-list')).toBeNull();
  });

  it('renders interventions in expanded state', () => {
    const interventions = [
      { type: 'action' as const, message: 'Review chapter 3', priority: 'high' as const, action_url: null },
    ];
    render(<AnalysisHistory analyses={[makeAnalysis({ interventions })]} />);
    fireEvent.click(screen.getByText('Expand'));
    expect(screen.getByTestId('intervention-card')).toBeDefined();
    expect(screen.getByText('Review chapter 3')).toBeDefined();
  });

  it('renders pattern display when patterns exist', () => {
    const patterns = { optimal_time: '18:00', avg_session_length: 45, consistency_score: 0.8, preferred_day: 'Monday' };
    render(<AnalysisHistory analyses={[makeAnalysis({ patterns })]} />);
    fireEvent.click(screen.getByText('Expand'));
    expect(screen.getByTestId('pattern-display')).toBeDefined();
  });

  it('limits visible entries to 10 and shows "Show more" button', () => {
    const analyses = Array.from({ length: 15 }, (_, i) =>
      makeAnalysis({ id: `a-${i}`, created_at: `2026-02-${String(20 - i).padStart(2, '0')}T10:00:00Z` })
    );
    render(<AnalysisHistory analyses={analyses} />);
    // Should show "Show 5 more entries" button
    expect(screen.getByText('Show 5 more entries')).toBeDefined();
  });

  it('shows all entries after clicking "Show more" button', () => {
    const analyses = Array.from({ length: 12 }, (_, i) =>
      makeAnalysis({ id: `a-${i}`, created_at: `2026-02-${String(20 - i).padStart(2, '0')}T10:00:00Z` })
    );
    render(<AnalysisHistory analyses={analyses} />);
    fireEvent.click(screen.getByText('Show 2 more entries'));
    expect(screen.getByText('Show less')).toBeDefined();
  });

  it('does not show "Show more" button when 10 or fewer entries', () => {
    const analyses = Array.from({ length: 8 }, (_, i) =>
      makeAnalysis({ id: `a-${i}`, created_at: `2026-02-${String(20 - i).padStart(2, '0')}T10:00:00Z` })
    );
    render(<AnalysisHistory analyses={analyses} />);
    expect(screen.queryByText(/Show.*more/)).toBeNull();
    expect(screen.queryByText('Show less')).toBeNull();
  });

  it('hides insights section when entry has no insights', () => {
    render(<AnalysisHistory analyses={[makeAnalysis({ insights: [] })]} />);
    fireEvent.click(screen.getByText('Expand'));
    expect(screen.queryByTestId('insight-list')).toBeNull();
  });
});
