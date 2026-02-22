import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// --- ChartLoadingSkeleton tests ---

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, style, ...props }: any) => (
    <div data-testid="skeleton" className={className} style={style} {...props} />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, asChild, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

// Mock next/link for EmptyChartState
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock export-utils for ExportChartButton
vi.mock('../lib/export-utils', () => ({
  exportChartAsPng: vi.fn(),
}));

import { ChartLoadingSkeleton } from './chart-loading-skeleton';
import { ChartErrorState } from './chart-error-state';
import { EmptyChartState } from './empty-chart-state';
import { ExportChartButton } from './export-chart-button';

describe('ChartLoadingSkeleton', () => {
  it('renders skeleton elements', () => {
    render(<ChartLoadingSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('uses default height of 300', () => {
    render(<ChartLoadingSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton');
    // The main skeleton should have height 300 in its style
    const mainSkeleton = skeletons.find(
      (s) => s.style.height === '300px'
    );
    expect(mainSkeleton).toBeDefined();
  });

  it('uses custom height when provided', () => {
    render(<ChartLoadingSkeleton height={200} />);
    const skeletons = screen.getAllByTestId('skeleton');
    const mainSkeleton = skeletons.find(
      (s) => s.style.height === '200px'
    );
    expect(mainSkeleton).toBeDefined();
  });

  it('renders multiple skeleton rows for visual loading', () => {
    render(<ChartLoadingSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton');
    // Should have at least 4 skeletons: 3 small ones + 1 large
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

describe('ChartErrorState', () => {
  it('renders default error message', () => {
    render(<ChartErrorState />);
    expect(screen.getByText('Failed to Load Chart')).toBeDefined();
    expect(screen.getByText('Failed to load chart data')).toBeDefined();
  });

  it('renders custom error message', () => {
    render(<ChartErrorState message="Server timeout" />);
    expect(screen.getByText('Server timeout')).toBeDefined();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ChartErrorState onRetry={onRetry} />);
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ChartErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ChartErrorState />);
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('renders the error icon heading', () => {
    render(<ChartErrorState />);
    expect(screen.getByText('Failed to Load Chart')).toBeDefined();
  });
});

describe('EmptyChartState', () => {
  it('renders default title and message', () => {
    render(<EmptyChartState />);
    expect(screen.getByText('No Study Data Yet')).toBeDefined();
    expect(screen.getByText('Start logging study sessions to see your progress visualized here.')).toBeDefined();
  });

  it('renders custom title and message', () => {
    render(
      <EmptyChartState
        title="No Sessions Found"
        message="Try a different date range."
      />
    );
    expect(screen.getByText('No Sessions Found')).toBeDefined();
    expect(screen.getByText('Try a different date range.')).toBeDefined();
  });

  it('renders CTA button when ctaLabel and ctaHref are provided', () => {
    render(
      <EmptyChartState ctaLabel="Start Now" ctaHref="/courses" />
    );
    const link = screen.getByText('Start Now');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/courses');
  });

  it('does not render CTA button when ctaLabel is missing', () => {
    render(<EmptyChartState ctaHref="/courses" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('does not render CTA button when ctaHref is missing', () => {
    render(<EmptyChartState ctaLabel="Start Now" />);
    expect(screen.queryByText('Start Now')).toBeNull();
  });
});

describe('ExportChartButton', () => {
  it('renders an export button with title', () => {
    const ref = { current: document.createElement('div') };
    render(<ExportChartButton chartRef={ref} />);
    const button = screen.getByTitle('Export as PNG');
    expect(button).toBeDefined();
  });

  it('renders with default filename', () => {
    const ref = { current: document.createElement('div') };
    render(<ExportChartButton chartRef={ref} />);
    // Button should exist and be clickable
    expect(screen.getByTitle('Export as PNG')).toBeDefined();
  });

  it('accepts a custom filename prop', () => {
    const ref = { current: document.createElement('div') };
    render(<ExportChartButton chartRef={ref} filename="my-chart" />);
    expect(screen.getByTitle('Export as PNG')).toBeDefined();
  });

  it('does not crash when clicked with null ref', () => {
    const ref = { current: null };
    render(<ExportChartButton chartRef={ref} />);
    // Clicking should not throw
    fireEvent.click(screen.getByTitle('Export as PNG'));
  });
});
