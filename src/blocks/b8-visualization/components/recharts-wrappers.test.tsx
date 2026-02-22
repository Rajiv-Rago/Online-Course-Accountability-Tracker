import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock recharts to avoid SSR/DOM issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: any) => <div data-testid="bar-chart" data-count={data?.length ?? 0}>{children}</div>,
  LineChart: ({ children, data }: any) => <div data-testid="line-chart" data-count={data?.length ?? 0}>{children}</div>,
  ComposedChart: ({ children, data }: any) => <div data-testid="composed-chart" data-count={data?.length ?? 0}>{children}</div>,
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  Area: ({ dataKey }: any) => <div data-testid={`area-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: ({ label }: any) => <div data-testid="reference-line" data-label={label?.value} />,
  ReferenceArea: () => <div data-testid="reference-area" />,
}));

// Mock chart config
vi.mock('../lib/chart-config', () => ({
  useChartTheme: vi.fn(() => ({
    background: '#ffffff',
    text: '#1f2937',
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltip: { background: '#fff', border: '#e5e7eb', text: '#1f2937' },
  })),
}));

// Mock chart-colors
vi.mock('../lib/chart-colors', () => ({
  riskZoneColors: {
    low: { bg: '#dcfce7', line: '#16a34a' },
    moderate: { bg: '#fef9c3', line: '#ca8a04' },
    high: { bg: '#ffedd5', line: '#ea580c' },
    critical: { bg: '#fecaca', line: '#dc2626' },
  },
  riskZoneColorsDark: {
    low: { bg: 'rgba(22,163,74,0.15)', line: '#4ade80' },
    moderate: { bg: 'rgba(202,138,4,0.15)', line: '#facc15' },
    high: { bg: 'rgba(234,88,12,0.15)', line: '#fb923c' },
    critical: { bg: 'rgba(220,38,38,0.15)', line: '#f87171' },
  },
  getCourseColor: vi.fn((i: number) => ['#2563eb', '#dc2626'][i % 2]),
}));

// Mock date-utils
vi.mock('../lib/date-utils', () => ({
  formatDateShort: vi.fn((d: string) => d),
}));

// Mock Badge for CompletionForecast
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span data-testid="badge" className={className}>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

import { StudyHoursBarChart } from './study-hours-bar-chart';
import { ProgressLineChart } from './progress-line-chart';
import { SessionDistributionChart } from './session-distribution';
import { RiskTrendChart } from './risk-trend-chart';
import { CompletionForecastChart } from './completion-forecast';
import type { ForecastResult } from '../lib/forecast-calculator';

describe('StudyHoursBarChart', () => {
  const mockData = [
    { period: 'Jan 1', periodStart: '2026-01-01', total: 3.5, 'c1': 2, 'c2': 1.5 },
    { period: 'Jan 2', periodStart: '2026-01-02', total: 2.0, 'c1': 1, 'c2': 1 },
  ];
  const mockCourses = [
    { id: 'c1', title: 'React', color: '#2563eb' },
    { id: 'c2', title: 'Node.js', color: '#dc2626' },
  ];

  it('renders without crashing', () => {
    render(
      <StudyHoursBarChart data={mockData} courses={mockCourses} goalLineHours={4} />
    );
    expect(screen.getByTestId('responsive-container')).toBeDefined();
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('renders a bar for each course', () => {
    render(
      <StudyHoursBarChart data={mockData} courses={mockCourses} goalLineHours={4} />
    );
    expect(screen.getByTestId('bar-c1')).toBeDefined();
    expect(screen.getByTestId('bar-c2')).toBeDefined();
  });

  it('renders a goal reference line when goalLineHours > 0', () => {
    render(
      <StudyHoursBarChart data={mockData} courses={mockCourses} goalLineHours={4} />
    );
    const refLine = screen.getByTestId('reference-line');
    expect(refLine).toBeDefined();
    expect(refLine.getAttribute('data-label')).toBe('Goal');
  });

  it('does not render goal line when goalLineHours is 0', () => {
    render(
      <StudyHoursBarChart data={mockData} courses={mockCourses} goalLineHours={0} />
    );
    expect(screen.queryByTestId('reference-line')).toBeNull();
  });

  it('renders axes and grid', () => {
    render(
      <StudyHoursBarChart data={mockData} courses={mockCourses} goalLineHours={2} />
    );
    expect(screen.getByTestId('x-axis')).toBeDefined();
    expect(screen.getByTestId('y-axis')).toBeDefined();
    expect(screen.getByTestId('grid')).toBeDefined();
  });
});

describe('ProgressLineChart', () => {
  const mockData = [
    { date: '2026-01-01', c1: 10, c2: 20 },
    { date: '2026-01-05', c1: 30, c2: 40 },
  ];
  const mockCourses = [
    { id: 'c1', title: 'React', color: '#2563eb', targetDate: '2026-06-01' },
    { id: 'c2', title: 'Node.js', color: '#dc2626', targetDate: null },
  ];

  it('renders without crashing', () => {
    render(<ProgressLineChart data={mockData} courses={mockCourses} />);
    expect(screen.getByTestId('responsive-container')).toBeDefined();
    expect(screen.getByTestId('line-chart')).toBeDefined();
  });

  it('renders a line for each course', () => {
    render(<ProgressLineChart data={mockData} courses={mockCourses} />);
    expect(screen.getByTestId('line-c1')).toBeDefined();
    expect(screen.getByTestId('line-c2')).toBeDefined();
  });

  it('renders reference line for courses with target dates', () => {
    render(<ProgressLineChart data={mockData} courses={mockCourses} />);
    // Only one course has a targetDate
    const refLines = screen.getAllByTestId('reference-line');
    expect(refLines.length).toBe(1);
  });

  it('renders axes and tooltip', () => {
    render(<ProgressLineChart data={mockData} courses={mockCourses} />);
    expect(screen.getByTestId('x-axis')).toBeDefined();
    expect(screen.getByTestId('y-axis')).toBeDefined();
    expect(screen.getByTestId('tooltip')).toBeDefined();
  });
});

describe('SessionDistributionChart', () => {
  const mockData = [
    { bucket: '0-15', min: 0, max: 15, count: 5 },
    { bucket: '16-30', min: 16, max: 30, count: 12 },
    { bucket: '31-60', min: 31, max: 60, count: 8 },
  ];

  it('renders without crashing', () => {
    render(<SessionDistributionChart data={mockData} averageDuration={25} />);
    expect(screen.getByTestId('responsive-container')).toBeDefined();
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('renders a count bar', () => {
    render(<SessionDistributionChart data={mockData} averageDuration={25} />);
    expect(screen.getByTestId('bar-count')).toBeDefined();
  });

  it('renders reference line for average when matching bucket exists', () => {
    render(<SessionDistributionChart data={mockData} averageDuration={25} />);
    const refLine = screen.getByTestId('reference-line');
    expect(refLine).toBeDefined();
  });

  it('renders with data count', () => {
    render(<SessionDistributionChart data={mockData} averageDuration={25} />);
    const chart = screen.getByTestId('bar-chart');
    expect(chart.getAttribute('data-count')).toBe('3');
  });
});

describe('RiskTrendChart', () => {
  const mockData = [
    { date: '2026-01-01', aggregate: 30, c1: 25, c2: 35 },
    { date: '2026-01-08', aggregate: 45, c1: 40, c2: 50 },
  ];
  const mockCourseColors = new Map([['c1', '#2563eb'], ['c2', '#dc2626']]);
  const mockCourses = [
    { id: 'c1', title: 'React', color: '#2563eb' },
    { id: 'c2', title: 'Node.js', color: '#dc2626' },
  ];

  it('renders without crashing', () => {
    render(
      <RiskTrendChart data={mockData} courseColors={mockCourseColors} courses={mockCourses} />
    );
    expect(screen.getByTestId('responsive-container')).toBeDefined();
    expect(screen.getByTestId('composed-chart')).toBeDefined();
  });

  it('renders risk zone reference areas', () => {
    render(
      <RiskTrendChart data={mockData} courseColors={mockCourseColors} courses={mockCourses} />
    );
    const refAreas = screen.getAllByTestId('reference-area');
    expect(refAreas.length).toBe(4); // low, moderate, high, critical
  });

  it('shows aggregate line by default', () => {
    render(
      <RiskTrendChart data={mockData} courseColors={mockCourseColors} courses={mockCourses} />
    );
    expect(screen.getByTestId('line-aggregate')).toBeDefined();
  });

  it('shows Aggregate and Per Course toggle buttons', () => {
    render(
      <RiskTrendChart data={mockData} courseColors={mockCourseColors} courses={mockCourses} />
    );
    expect(screen.getByText('Aggregate')).toBeDefined();
    expect(screen.getByText('Per Course')).toBeDefined();
  });
});

describe('CompletionForecastChart', () => {
  const mockForecast: ForecastResult = {
    status: 'on_track',
    predictedDate: '2026-06-15',
    velocity: 1.5,
    confidence70: { earliest: '2026-05-01', latest: '2026-07-01' },
    confidence90: { earliest: '2026-04-01', latest: '2026-08-01' },
    projectedPoints: [
      { date: '2026-01-01', actual: 10, projected: null, ci70Upper: null, ci70Lower: null, ci90Upper: null, ci90Lower: null },
      { date: '2026-03-01', actual: null, projected: 30, ci70Upper: 35, ci70Lower: 25, ci90Upper: 40, ci90Lower: 20 },
    ],
  };

  it('renders without crashing', () => {
    render(
      <CompletionForecastChart forecast={mockForecast} targetDate="2026-06-01" />
    );
    expect(screen.getByTestId('responsive-container')).toBeDefined();
    expect(screen.getByTestId('composed-chart')).toBeDefined();
  });

  it('renders the status badge with On Track label', () => {
    render(
      <CompletionForecastChart forecast={mockForecast} targetDate="2026-06-01" />
    );
    expect(screen.getByText('On Track')).toBeDefined();
  });

  it('renders predicted date text', () => {
    render(
      <CompletionForecastChart forecast={mockForecast} targetDate="2026-06-01" />
    );
    expect(screen.getByText(/Predicted:/)).toBeDefined();
  });

  it('renders actual and projected lines', () => {
    render(
      <CompletionForecastChart forecast={mockForecast} targetDate="2026-06-01" />
    );
    expect(screen.getByTestId('line-actual')).toBeDefined();
    expect(screen.getByTestId('line-projected')).toBeDefined();
  });

  it('renders confidence interval areas', () => {
    render(
      <CompletionForecastChart forecast={mockForecast} targetDate="2026-06-01" />
    );
    expect(screen.getByTestId('area-ci90Upper')).toBeDefined();
    expect(screen.getByTestId('area-ci90Lower')).toBeDefined();
    expect(screen.getByTestId('area-ci70Upper')).toBeDefined();
    expect(screen.getByTestId('area-ci70Lower')).toBeDefined();
  });

  it('renders target and predicted reference lines', () => {
    render(
      <CompletionForecastChart forecast={mockForecast} targetDate="2026-06-01" />
    );
    const refLines = screen.getAllByTestId('reference-line');
    // target + predicted = 2
    expect(refLines.length).toBe(2);
  });

  it('renders status badge for behind schedule', () => {
    const behindForecast: ForecastResult = {
      ...mockForecast,
      status: 'behind',
    };
    render(
      <CompletionForecastChart forecast={behindForecast} targetDate="2026-06-01" />
    );
    expect(screen.getByText('Behind Schedule')).toBeDefined();
  });

  it('renders status badge for stalled', () => {
    const stalledForecast: ForecastResult = {
      ...mockForecast,
      status: 'stalled',
      predictedDate: null,
    };
    render(
      <CompletionForecastChart forecast={stalledForecast} targetDate={null} />
    );
    expect(screen.getByText('Stalled')).toBeDefined();
  });

  it('does not render predicted date text when predictedDate is null', () => {
    const noDateForecast: ForecastResult = {
      ...mockForecast,
      predictedDate: null,
    };
    render(
      <CompletionForecastChart forecast={noDateForecast} targetDate={null} />
    );
    expect(screen.queryByText(/Predicted:/)).toBeNull();
  });
});
