import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<any>, _opts?: any) => {
    const name = loader.toString();
    if (name.includes('progress-line-chart')) {
      return function ProgressLineChart() { return <div data-testid="progress-line-chart" />; };
    }
    if (name.includes('completion-forecast')) {
      return function CompletionForecastChart() { return <div data-testid="completion-forecast-chart" />; };
    }
    if (name.includes('risk-trend-chart')) {
      return function RiskTrendChart() { return <div data-testid="risk-trend-chart" />; };
    }
    if (name.includes('session-distribution')) {
      return function SessionDistributionChart() { return <div data-testid="session-distribution-chart" />; };
    }
    return function DynamicFallback() { return <div data-testid="dynamic-fallback" />; };
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

// Mock child components
vi.mock('./chart-range-selector', () => ({
  ChartRangeSelector: () => <div data-testid="chart-range-selector" />,
}));

vi.mock('./chart-wrapper', () => ({
  ChartWrapper: ({ title, children, isLoading, isEmpty }: any) => (
    <div data-testid={`chart-wrapper-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <h3>{title}</h3>
      {!isLoading && !isEmpty && children}
    </div>
  ),
}));

vi.mock('./chart-loading-skeleton', () => ({
  ChartLoadingSkeleton: () => <div data-testid="loading-skeleton" />,
}));

vi.mock('./empty-chart-state', () => ({
  EmptyChartState: () => <div data-testid="empty-state" />,
}));

// Mock chart-colors
vi.mock('../lib/chart-colors', () => ({
  getCourseColor: vi.fn(() => '#2563eb'),
}));

// Mock hooks - use vi.hoisted to ensure availability before vi.mock hoisting
const {
  mockUseChartRange,
  mockUseProgressTimeline,
  mockUseCompletionForecast,
  mockUseRiskTrend,
  mockUseSessionDistribution,
} = vi.hoisted(() => ({
  mockUseChartRange: vi.fn(() => ({
    range: '30d',
    dateRange: { startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-02-01T00:00:00.000Z' },
    setRange: vi.fn(),
    setCustomRange: vi.fn(),
  })),
  mockUseProgressTimeline: vi.fn(() => ({
    data: {
      sessions: [],
      courses: [
        { id: 'course-1', title: 'Advanced React', total_hours: 40, total_modules: null, target_completion_date: '2026-06-01' },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    chartData: {
      points: [{ date: '2026-01-01', 'course-1': 10 }],
      courses: [{ id: 'course-1', title: 'Advanced React', color: '#2563eb' }],
    },
  })),
  mockUseCompletionForecast: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    forecast: {
      predictedDate: '2026-05-15',
      status: 'on_track',
      velocity: 1.2,
      confidence70: null,
      confidence90: null,
      projectedPoints: [],
    },
    courseTitle: 'Advanced React',
    targetDate: '2026-06-01',
  })),
  mockUseRiskTrend: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    chartData: { points: [{ date: '2026-01-01', aggregate: 25 }], courseColors: new Map() },
  })),
  mockUseSessionDistribution: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    chartData: { buckets: [{ bucket: '0-30', min: 0, max: 30, count: 5, percentage: 50 }], averageDuration: 25, medianDuration: 20, totalSessions: 10 },
  })),
}));

vi.mock('../hooks/use-chart-range', () => ({
  useChartRange: () => mockUseChartRange(),
}));

vi.mock('../hooks/use-progress-timeline', () => ({
  useProgressTimeline: (...args: any[]) => mockUseProgressTimeline(...args),
}));

vi.mock('../hooks/use-completion-forecast', () => ({
  useCompletionForecast: (...args: any[]) => mockUseCompletionForecast(...args),
}));

vi.mock('../hooks/use-risk-trend', () => ({
  useRiskTrend: (...args: any[]) => mockUseRiskTrend(...args),
}));

vi.mock('../hooks/use-session-distribution', () => ({
  useSessionDistribution: (...args: any[]) => mockUseSessionDistribution(...args),
}));

import { CourseVisualizationPage } from './course-visualization-page';

describe('CourseVisualizationPage', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
      forward: vi.fn(),
    });
  });

  it('renders the course title from progress data', () => {
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByText('Advanced React')).toBeDefined();
  });

  it('renders "Course Visualizations" subtitle', () => {
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByText('Course Visualizations')).toBeDefined();
  });

  it('renders back button', () => {
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByText('Back')).toBeDefined();
  });

  it('navigates to /visualizations when back button is clicked', () => {
    render(<CourseVisualizationPage courseId="course-1" />);
    fireEvent.click(screen.getByText('Back'));
    expect(mockPush).toHaveBeenCalledWith('/visualizations');
  });

  it('renders the range selector', () => {
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByTestId('chart-range-selector')).toBeDefined();
  });

  it('renders Progress Over Time chart wrapper', () => {
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByTestId('chart-wrapper-progress-over-time')).toBeDefined();
  });

  it('renders Completion Forecast chart wrapper', () => {
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByTestId('chart-wrapper-completion-forecast')).toBeDefined();
  });

  it('renders Risk Score Trend chart wrapper', () => {
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByTestId('chart-wrapper-risk-score-trend')).toBeDefined();
  });

  it('renders Session Distribution chart wrapper', () => {
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByTestId('chart-wrapper-session-distribution')).toBeDefined();
  });

  it('falls back to forecast courseTitle when progress data has no match', () => {
    mockUseProgressTimeline.mockReturnValue({
      data: { sessions: [], courses: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      chartData: { points: [], courses: [] },
    });
    mockUseCompletionForecast.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      forecast: null,
      courseTitle: 'Fallback Title',
      targetDate: null,
    });
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByText('Fallback Title')).toBeDefined();
  });

  it('uses "Course" as fallback when no title is available', () => {
    mockUseProgressTimeline.mockReturnValue({
      data: { sessions: [], courses: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      chartData: { points: [], courses: [] },
    });
    mockUseCompletionForecast.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      forecast: null,
      courseTitle: null,
      targetDate: null,
    });
    render(<CourseVisualizationPage courseId="course-1" />);
    expect(screen.getByText('Course')).toBeDefined();
  });
});
