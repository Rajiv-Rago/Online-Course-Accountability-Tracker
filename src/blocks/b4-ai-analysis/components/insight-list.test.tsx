import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock child component BEFORE importing
// ---------------------------------------------------------------------------

vi.mock('./insight-card', () => ({
  InsightCard: ({ insight }: any) => (
    <div data-testid={`insight-${insight.type}-${insight.title}`}>
      {insight.title}: {insight.description}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import { InsightList } from './insight-list';
import type { AiInsight } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInsight(overrides: Partial<AiInsight> = {}): AiInsight {
  return {
    type: 'positive',
    title: 'Good progress',
    description: 'You are doing well',
    confidence: 0.85,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InsightList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "No insights available." when insights array is empty', () => {
    render(<InsightList insights={[]} />);
    expect(screen.getByText('No insights available.')).toBeDefined();
  });

  it('renders all insight cards when count is within default maxVisible', () => {
    const insights = [
      makeInsight({ title: 'Insight A' }),
      makeInsight({ title: 'Insight B' }),
      makeInsight({ title: 'Insight C' }),
    ];
    render(<InsightList insights={insights} />);
    expect(screen.getByText('Insight A: You are doing well')).toBeDefined();
    expect(screen.getByText('Insight B: You are doing well')).toBeDefined();
    expect(screen.getByText('Insight C: You are doing well')).toBeDefined();
  });

  it('limits visible insights to default maxVisible of 3', () => {
    const insights = [
      makeInsight({ title: 'One' }),
      makeInsight({ title: 'Two' }),
      makeInsight({ title: 'Three' }),
      makeInsight({ title: 'Four' }),
      makeInsight({ title: 'Five' }),
    ];
    render(<InsightList insights={insights} />);
    expect(screen.getByText('One: You are doing well')).toBeDefined();
    expect(screen.getByText('Two: You are doing well')).toBeDefined();
    expect(screen.getByText('Three: You are doing well')).toBeDefined();
    expect(screen.queryByText('Four: You are doing well')).toBeNull();
    expect(screen.queryByText('Five: You are doing well')).toBeNull();
  });

  it('shows "Show N more" button when there are more insights than maxVisible', () => {
    const insights = Array.from({ length: 5 }, (_, i) =>
      makeInsight({ title: `Insight ${i + 1}` })
    );
    render(<InsightList insights={insights} />);
    expect(screen.getByText('Show 2 more')).toBeDefined();
  });

  it('does not show "Show more" button when all insights are visible', () => {
    const insights = [makeInsight({ title: 'Only One' })];
    render(<InsightList insights={insights} />);
    expect(screen.queryByText(/Show.*more/)).toBeNull();
  });

  it('shows all insights when "Show more" is clicked', () => {
    const insights = Array.from({ length: 5 }, (_, i) =>
      makeInsight({ title: `Insight ${i + 1}` })
    );
    render(<InsightList insights={insights} />);
    fireEvent.click(screen.getByText('Show 2 more'));
    expect(screen.getByText('Insight 4: You are doing well')).toBeDefined();
    expect(screen.getByText('Insight 5: You are doing well')).toBeDefined();
  });

  it('shows "Show less" after expanding', () => {
    const insights = Array.from({ length: 5 }, (_, i) =>
      makeInsight({ title: `Insight ${i + 1}` })
    );
    render(<InsightList insights={insights} />);
    fireEvent.click(screen.getByText('Show 2 more'));
    expect(screen.getByText('Show less')).toBeDefined();
  });

  it('collapses back to maxVisible when "Show less" is clicked', () => {
    const insights = Array.from({ length: 5 }, (_, i) =>
      makeInsight({ title: `Insight ${i + 1}` })
    );
    render(<InsightList insights={insights} />);
    fireEvent.click(screen.getByText('Show 2 more'));
    fireEvent.click(screen.getByText('Show less'));
    expect(screen.queryByText('Insight 4: You are doing well')).toBeNull();
    expect(screen.queryByText('Insight 5: You are doing well')).toBeNull();
    expect(screen.getByText('Show 2 more')).toBeDefined();
  });

  it('respects custom maxVisible prop', () => {
    const insights = Array.from({ length: 6 }, (_, i) =>
      makeInsight({ title: `Insight ${i + 1}` })
    );
    render(<InsightList insights={insights} maxVisible={2} />);
    expect(screen.getByText('Insight 1: You are doing well')).toBeDefined();
    expect(screen.getByText('Insight 2: You are doing well')).toBeDefined();
    expect(screen.queryByText('Insight 3: You are doing well')).toBeNull();
    expect(screen.getByText('Show 4 more')).toBeDefined();
  });

  it('renders exactly maxVisible insights when count equals maxVisible', () => {
    const insights = Array.from({ length: 3 }, (_, i) =>
      makeInsight({ title: `Insight ${i + 1}` })
    );
    render(<InsightList insights={insights} maxVisible={3} />);
    expect(screen.getByText('Insight 1: You are doing well')).toBeDefined();
    expect(screen.getByText('Insight 2: You are doing well')).toBeDefined();
    expect(screen.getByText('Insight 3: You are doing well')).toBeDefined();
    expect(screen.queryByText(/Show.*more/)).toBeNull();
  });
});
