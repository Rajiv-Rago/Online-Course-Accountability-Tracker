import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/dynamic to just render the component directly
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<any>, _opts?: any) => {
    // Return a placeholder component for dynamically-imported chart wrappers
    const name = loader.toString();
    if (name.includes('study-hours-bar-chart')) {
      return function StudyHoursBarChart() { return <div data-testid="study-hours-bar-chart" />; };
    }
    if (name.includes('progress-line-chart')) {
      return function ProgressLineChart() { return <div data-testid="progress-line-chart" />; };
    }
    if (name.includes('risk-trend-chart')) {
      return function RiskTrendChart() { return <div data-testid="risk-trend-chart" />; };
    }
    if (name.includes('session-distribution')) {
      return function SessionDistributionChart() { return <div data-testid="session-distribution-chart" />; };
    }
    if (name.includes('pattern-insights')) {
      return function PatternInsights() { return <div data-testid="pattern-insights" />; };
    }
    return function DynamicFallback() { return <div data-testid="dynamic-fallback" />; };
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, asChild, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

// Mock all child components
vi.mock('./chart-range-selector', () => ({
  ChartRangeSelector: () => <div data-testid="chart-range-selector" />,
}));

vi.mock('./chart-course-filter', () => ({
  ChartCourseFilter: () => <div data-testid="chart-course-filter" />,
}));

vi.mock('./chart-period-toggle', () => ({
  ChartPeriodToggle: ({ value, onChange }: any) => (
    <div data-testid="chart-period-toggle" data-value={value} />
  ),
}));

vi.mock('./chart-wrapper', () => ({
  ChartWrapper: ({ title, children, isLoading, isEmpty }: any) => (
    <div data-testid={`chart-wrapper-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <h3>{title}</h3>
      {!isLoading && !isEmpty && children}
    </div>
  ),
}));

vi.mock('./study-heatmap', () => ({
  StudyHeatmap: ({ year }: any) => <div data-testid="study-heatmap" data-year={year} />,
}));

vi.mock('./chart-loading-skeleton', () => ({
  ChartLoadingSkeleton: ({ height }: any) => <div data-testid="loading-skeleton" />,
}));

vi.mock('./empty-chart-state', () => ({
  EmptyChartState: () => <div data-testid="empty-chart-state" />,
}));

// Mock hooks
const mockUseChartRange = vi.fn(() => ({
  range: '30d',
  dateRange: { startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-02-01T00:00:00.000Z' },
  setRange: vi.fn(),
  setCustomRange: vi.fn(),
}));

const mockUseChartCourseFilter = vi.fn(() => ({
  selectedCourseIds: [] as string[],
  setSelectedCourseIds: vi.fn(),
  courses: [
    { id: 'c1', title: 'React', color: '#2563eb' },
    { id: 'c2', title: 'Node.js', color: '#dc2626' },
  ],
  isAllSelected: true,
  isLoading: false,
}));

const mockUseHeatmapData = vi.fn(() => ({
  data: {
    cells: [{ date: '2026-01-01', dayOfWeek: 0, weekIndex: 0, minutes: 30, sessionCount: 1, level: 1 }],
    totalWeeks: 52,
    summary: { totalHours: 100, totalSessions: 50, totalActiveDays: 30, longestStreak: 7, mostActiveDay: 'Tuesday' },
  },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}));

const mockUseProgressTimeline = vi.fn(() => ({
  data: { sessions: [], courses: [] },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  chartData: { points: [], courses: [] },
}));

const mockUseStudyHoursChart = vi.fn(() => ({
  data: null,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  chartData: { points: [], courses: [], totalHours: 0, goalLineHours: 0 },
}));

const mockUseRiskTrend = vi.fn(() => ({
  data: null,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  chartData: { points: [], courseColors: new Map() },
}));

const mockUseSessionDistribution = vi.fn(() => ({
  data: null,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  chartData: { buckets: [], averageDuration: 0, medianDuration: 0, totalSessions: 0 },
}));

vi.mock('../hooks/use-chart-range', () => ({
  useChartRange: () => mockUseChartRange(),
}));

vi.mock('../hooks/use-chart-course-filter', () => ({
  useChartCourseFilter: () => mockUseChartCourseFilter(),
}));

vi.mock('../hooks/use-heatmap-data', () => ({
  useHeatmapData: (...args: any[]) => mockUseHeatmapData(...args),
}));

vi.mock('../hooks/use-progress-timeline', () => ({
  useProgressTimeline: (...args: any[]) => mockUseProgressTimeline(...args),
}));

vi.mock('../hooks/use-study-hours-chart', () => ({
  useStudyHoursChart: (...args: any[]) => mockUseStudyHoursChart(...args),
}));

vi.mock('../hooks/use-risk-trend', () => ({
  useRiskTrend: (...args: any[]) => mockUseRiskTrend(...args),
}));

vi.mock('../hooks/use-session-distribution', () => ({
  useSessionDistribution: (...args: any[]) => mockUseSessionDistribution(...args),
}));

import { VisualizationPage } from './visualization-page';

describe('VisualizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to defaults
    mockUseChartRange.mockReturnValue({
      range: '30d',
      dateRange: { startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-02-01T00:00:00.000Z' },
      setRange: vi.fn(),
      setCustomRange: vi.fn(),
    });
    mockUseHeatmapData.mockReturnValue({
      data: {
        cells: [{ date: '2026-01-01', dayOfWeek: 0, weekIndex: 0, minutes: 30, sessionCount: 1, level: 1 }],
        totalWeeks: 52,
        summary: { totalHours: 100, totalSessions: 50, totalActiveDays: 30, longestStreak: 7, mostActiveDay: 'Tuesday' },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders page title', () => {
    render(<VisualizationPage />);
    expect(screen.getByText('Insights & Visualizations')).toBeDefined();
  });

  it('renders subtitle text', () => {
    render(<VisualizationPage />);
    expect(screen.getByText('Charts and patterns from your study data.')).toBeDefined();
  });

  it('renders course filter and range selector', () => {
    render(<VisualizationPage />);
    expect(screen.getByTestId('chart-course-filter')).toBeDefined();
    expect(screen.getByTestId('chart-range-selector')).toBeDefined();
  });

  it('renders study heatmap when data is available', () => {
    render(<VisualizationPage />);
    expect(screen.getByTestId('study-heatmap')).toBeDefined();
  });

  it('shows heatmap loading skeleton when loading', () => {
    mockUseHeatmapData.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<VisualizationPage />);
    expect(screen.getByTestId('loading-skeleton')).toBeDefined();
  });

  it('shows empty state when heatmap has no cells', () => {
    mockUseHeatmapData.mockReturnValue({
      data: { cells: [], totalWeeks: 52, summary: {} },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<VisualizationPage />);
    expect(screen.getByTestId('empty-chart-state')).toBeDefined();
  });

  it('renders chart wrappers for Study Hours, Progress, Risk, and Distribution', () => {
    render(<VisualizationPage />);
    expect(screen.getByTestId('chart-wrapper-study-hours')).toBeDefined();
    expect(screen.getByTestId('chart-wrapper-progress-over-time')).toBeDefined();
    expect(screen.getByTestId('chart-wrapper-risk-score-trend')).toBeDefined();
    expect(screen.getByTestId('chart-wrapper-session-distribution')).toBeDefined();
  });

  it('renders pattern insights section', () => {
    render(<VisualizationPage />);
    expect(screen.getByTestId('pattern-insights')).toBeDefined();
  });

  it('renders Full Screen link for heatmap', () => {
    render(<VisualizationPage />);
    expect(screen.getByText('Full Screen')).toBeDefined();
  });

  it('renders separators', () => {
    render(<VisualizationPage />);
    const separators = screen.getAllByTestId('separator');
    expect(separators.length).toBeGreaterThanOrEqual(2);
  });
});
