import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./chart-loading-skeleton', () => ({
  ChartLoadingSkeleton: ({ height }: { height?: number }) => (
    <div data-testid="loading-skeleton" data-height={height}>Loading...</div>
  ),
}));

vi.mock('./pattern-insight-card', () => ({
  PatternInsightCard: ({ insight }: any) => (
    <div data-testid="pattern-card">{insight.title}</div>
  ),
}));

const mockUsePatternInsights = vi.fn();

vi.mock('../hooks/use-pattern-insights', () => ({
  usePatternInsights: (...args: any[]) => mockUsePatternInsights(...args),
}));

import { PatternInsights } from './pattern-insights';
import type { PatternInsight } from '../lib/pattern-detector';

const defaultDateRange = {
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-02-01T00:00:00.000Z',
};

const mockInsight: PatternInsight = {
  id: 'best-study-day',
  title: 'Best Study Day',
  description: 'You study most on Tuesdays',
  confidence: 0.85,
  supportingData: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    values: [30, 90, 45, 20, 55],
    chartType: 'bar',
  },
  category: 'timing',
};

describe('PatternInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when isLoading is true', () => {
    mockUsePatternInsights.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    render(<PatternInsights courseIds={[]} dateRange={defaultDateRange} />);
    expect(screen.getByTestId('loading-skeleton')).toBeDefined();
    expect(screen.getByText('Pattern Insights')).toBeDefined();
  });

  it('renders nothing when there is an error', () => {
    mockUsePatternInsights.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
    });
    const { container } = render(
      <PatternInsights courseIds={[]} dateRange={defaultDateRange} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when data is null', () => {
    mockUsePatternInsights.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    const { container } = render(
      <PatternInsights courseIds={[]} dateRange={defaultDateRange} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows insufficient data message when hasSufficientData is false', () => {
    mockUsePatternInsights.mockReturnValue({
      data: { insights: [], hasSufficientData: false },
      isLoading: false,
      error: null,
    });
    render(<PatternInsights courseIds={[]} dateRange={defaultDateRange} />);
    expect(screen.getByText('Need More Data')).toBeDefined();
    expect(screen.getByText(/At least 14 days of data and 10 sessions/)).toBeDefined();
  });

  it('shows no patterns message when insights array is empty but has sufficient data', () => {
    mockUsePatternInsights.mockReturnValue({
      data: { insights: [], hasSufficientData: true },
      isLoading: false,
      error: null,
    });
    render(<PatternInsights courseIds={[]} dateRange={defaultDateRange} />);
    expect(screen.getByText('No Strong Patterns Found')).toBeDefined();
    expect(screen.getByText(/Keep studying consistently/)).toBeDefined();
  });

  it('renders pattern insight cards when insights are present', () => {
    mockUsePatternInsights.mockReturnValue({
      data: {
        insights: [
          mockInsight,
          { ...mockInsight, id: 'peak-time', title: 'Peak Study Time' },
        ],
        hasSufficientData: true,
      },
      isLoading: false,
      error: null,
    });
    render(<PatternInsights courseIds={['c1']} dateRange={defaultDateRange} />);
    expect(screen.getByText('Pattern Insights')).toBeDefined();
    const cards = screen.getAllByTestId('pattern-card');
    expect(cards.length).toBe(2);
    expect(screen.getByText('Best Study Day')).toBeDefined();
    expect(screen.getByText('Peak Study Time')).toBeDefined();
  });

  it('always renders the section heading', () => {
    mockUsePatternInsights.mockReturnValue({
      data: { insights: [mockInsight], hasSufficientData: true },
      isLoading: false,
      error: null,
    });
    render(<PatternInsights courseIds={[]} dateRange={defaultDateRange} />);
    expect(screen.getByText('Pattern Insights')).toBeDefined();
  });

  it('passes courseIds and dateRange to the hook', () => {
    mockUsePatternInsights.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    render(<PatternInsights courseIds={['c1', 'c2']} dateRange={defaultDateRange} />);
    expect(mockUsePatternInsights).toHaveBeenCalledWith(
      ['c1', 'c2'],
      defaultDateRange
    );
  });
});
