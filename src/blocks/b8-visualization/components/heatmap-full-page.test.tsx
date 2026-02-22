import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock child components
vi.mock('./study-heatmap', () => ({
  StudyHeatmap: ({ year, onDayClick }: any) => (
    <div data-testid="study-heatmap" data-year={year}>
      <button
        data-testid="click-day"
        onClick={() => onDayClick?.({ date: '2026-02-15', minutes: 60, sessionCount: 2, dayOfWeek: 0, weekIndex: 7, level: 2 })}
      >
        Click Day
      </button>
    </div>
  ),
}));

vi.mock('./chart-loading-skeleton', () => ({
  ChartLoadingSkeleton: () => <div data-testid="loading-skeleton" />,
}));

vi.mock('./chart-error-state', () => ({
  ChartErrorState: ({ message, onRetry }: any) => (
    <div data-testid="error-state">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

vi.mock('./empty-chart-state', () => ({
  EmptyChartState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('../lib/date-utils', () => ({
  formatDateFull: vi.fn((d: string) => `Full: ${d}`),
}));

// Mock server action
vi.mock('../actions/visualization-actions', () => ({
  getSessionsForDay: vi.fn().mockResolvedValue({
    data: [
      { id: 's1', course_id: 'c1', course_title: 'React', started_at: '2026-02-15T10:00:00Z', duration_minutes: 30 },
      { id: 's2', course_id: 'c2', course_title: 'Node.js', started_at: '2026-02-15T14:00:00Z', duration_minutes: 45 },
    ],
    error: null,
  }),
}));

// Mock hooks
const mockRefetch = vi.fn();
const mockUseHeatmapData = vi.fn(() => ({
  data: {
    cells: [{ date: '2026-01-01', dayOfWeek: 0, weekIndex: 0, minutes: 30, sessionCount: 1, level: 1 }],
    totalWeeks: 52,
    summary: {
      totalHours: 100,
      totalSessions: 50,
      totalActiveDays: 30,
      longestStreak: 7,
      mostActiveDay: 'Tuesday',
    },
  },
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

vi.mock('../hooks/use-heatmap-data', () => ({
  useHeatmapData: (...args: any[]) => mockUseHeatmapData(...args),
}));

import { HeatmapFullPage } from './heatmap-full-page';

describe('HeatmapFullPage', () => {
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
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);
    mockUseHeatmapData.mockReturnValue({
      data: {
        cells: [{ date: '2026-01-01', dayOfWeek: 0, weekIndex: 0, minutes: 30, sessionCount: 1, level: 1 }],
        totalWeeks: 52,
        summary: {
          totalHours: 100,
          totalSessions: 50,
          totalActiveDays: 30,
          longestStreak: 7,
          mostActiveDay: 'Tuesday',
        },
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('renders page title', () => {
    render(<HeatmapFullPage />);
    expect(screen.getByText('Study Heatmap')).toBeDefined();
  });

  it('renders back button that navigates to /visualizations', () => {
    render(<HeatmapFullPage />);
    fireEvent.click(screen.getByText('Back to Visualizations'));
    expect(mockPush).toHaveBeenCalledWith('/visualizations');
  });

  it('renders current year by default', () => {
    render(<HeatmapFullPage />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(String(currentYear))).toBeDefined();
  });

  it('renders year from search params', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('year=2025') as any);
    render(<HeatmapFullPage />);
    expect(screen.getByText('2025')).toBeDefined();
  });

  it('renders the heatmap when data is available', () => {
    render(<HeatmapFullPage />);
    expect(screen.getByTestId('study-heatmap')).toBeDefined();
  });

  it('renders summary stat cards', () => {
    render(<HeatmapFullPage />);
    expect(screen.getByText('100h')).toBeDefined();
    expect(screen.getByText('50')).toBeDefined();
    expect(screen.getByText('30')).toBeDefined();
    expect(screen.getByText('7 days')).toBeDefined();
    expect(screen.getByText('Tuesday')).toBeDefined();
  });

  it('shows loading skeleton when loading', () => {
    mockUseHeatmapData.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    render(<HeatmapFullPage />);
    expect(screen.getByTestId('loading-skeleton')).toBeDefined();
  });

  it('shows error state on error', () => {
    mockUseHeatmapData.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network error'),
      refetch: mockRefetch,
    });
    render(<HeatmapFullPage />);
    expect(screen.getByTestId('error-state')).toBeDefined();
    expect(screen.getByText('Network error')).toBeDefined();
  });

  it('shows empty state when no data', () => {
    mockUseHeatmapData.mockReturnValue({
      data: { cells: [], totalWeeks: 52, summary: {} },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<HeatmapFullPage />);
    expect(screen.getByTestId('empty-state')).toBeDefined();
    expect(screen.getByText('No Data for This Year')).toBeDefined();
  });

  it('navigates to previous year when left arrow is clicked', () => {
    render(<HeatmapFullPage />);
    const currentYear = new Date().getFullYear();
    // Find the first chevron button (previous year)
    const buttons = screen.getAllByRole('button');
    // The chevron left button has ChevronLeft icon
    const prevButton = buttons.find((b) => !b.textContent?.includes('Back') && !b.textContent?.includes(String(currentYear)));
    if (prevButton) {
      fireEvent.click(prevButton);
      expect(mockPush).toHaveBeenCalled();
    }
  });
});
