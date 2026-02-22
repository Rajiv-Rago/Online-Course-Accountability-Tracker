import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock child components
vi.mock('./chart-loading-skeleton', () => ({
  ChartLoadingSkeleton: ({ height }: { height?: number }) => (
    <div data-testid="loading-skeleton" data-height={height}>Loading...</div>
  ),
}));

vi.mock('./chart-error-state', () => ({
  ChartErrorState: ({ message, onRetry }: { message?: string; onRetry?: () => void }) => (
    <div data-testid="error-state">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

vi.mock('./empty-chart-state', () => ({
  EmptyChartState: () => <div data-testid="empty-state">No data</div>,
}));

vi.mock('./export-chart-button', () => ({
  ExportChartButton: ({ filename }: { filename?: string; chartRef: React.RefObject<HTMLDivElement | null> }) => (
    <button data-testid="export-button" data-filename={filename}>Export</button>
  ),
}));

import { ChartWrapper } from './chart-wrapper';

describe('ChartWrapper', () => {
  it('renders the title', () => {
    render(
      <ChartWrapper title="Study Hours">
        <div>Chart content</div>
      </ChartWrapper>
    );
    expect(screen.getByText('Study Hours')).toBeDefined();
  });

  it('renders children when not loading, no error, and not empty', () => {
    render(
      <ChartWrapper title="Chart">
        <div data-testid="chart-content">Real chart</div>
      </ChartWrapper>
    );
    expect(screen.getByTestId('chart-content')).toBeDefined();
    expect(screen.getByText('Real chart')).toBeDefined();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(
      <ChartWrapper title="Chart" isLoading>
        <div>Chart content</div>
      </ChartWrapper>
    );
    expect(screen.getByTestId('loading-skeleton')).toBeDefined();
    expect(screen.queryByText('Chart content')).toBeNull();
  });

  it('shows error state with message when error is provided', () => {
    const error = new Error('Network error');
    render(
      <ChartWrapper title="Chart" error={error}>
        <div>Chart content</div>
      </ChartWrapper>
    );
    expect(screen.getByTestId('error-state')).toBeDefined();
    expect(screen.getByText('Network error')).toBeDefined();
    expect(screen.queryByText('Chart content')).toBeNull();
  });

  it('shows error state with retry button that calls onRetry', () => {
    const onRetry = vi.fn();
    const error = new Error('Something went wrong');
    render(
      <ChartWrapper title="Chart" error={error} onRetry={onRetry}>
        <div>Chart content</div>
      </ChartWrapper>
    );
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows empty chart state when isEmpty is true', () => {
    render(
      <ChartWrapper title="Chart" isEmpty>
        <div>Chart content</div>
      </ChartWrapper>
    );
    expect(screen.getByTestId('empty-state')).toBeDefined();
    expect(screen.queryByText('Chart content')).toBeNull();
  });

  it('prioritizes error over empty state', () => {
    const error = new Error('Error occurred');
    render(
      <ChartWrapper title="Chart" error={error} isEmpty>
        <div>Chart content</div>
      </ChartWrapper>
    );
    expect(screen.getByTestId('error-state')).toBeDefined();
    expect(screen.queryByTestId('empty-state')).toBeNull();
  });

  it('prioritizes loading over error and empty states', () => {
    const error = new Error('Error occurred');
    render(
      <ChartWrapper title="Chart" isLoading error={error} isEmpty>
        <div>Chart content</div>
      </ChartWrapper>
    );
    expect(screen.getByTestId('loading-skeleton')).toBeDefined();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.queryByTestId('empty-state')).toBeNull();
  });

  it('renders the export button with filename derived from title', () => {
    render(
      <ChartWrapper title="Study Hours Over Time">
        <div>Chart content</div>
      </ChartWrapper>
    );
    const exportBtn = screen.getByTestId('export-button');
    expect(exportBtn).toBeDefined();
    expect(exportBtn.getAttribute('data-filename')).toBe('study-hours-over-time');
  });

  it('renders the export button with custom filename', () => {
    render(
      <ChartWrapper title="Chart" filename="custom-export">
        <div>Chart content</div>
      </ChartWrapper>
    );
    const exportBtn = screen.getByTestId('export-button');
    expect(exportBtn.getAttribute('data-filename')).toBe('custom-export');
  });

  it('renders headerActions alongside export button', () => {
    render(
      <ChartWrapper title="Chart" headerActions={<button data-testid="custom-action">Action</button>}>
        <div>Chart content</div>
      </ChartWrapper>
    );
    expect(screen.getByTestId('custom-action')).toBeDefined();
    expect(screen.getByTestId('export-button')).toBeDefined();
  });
});
