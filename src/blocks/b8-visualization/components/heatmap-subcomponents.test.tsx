import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock date-utils for HeatmapTooltip
vi.mock('../lib/date-utils', () => ({
  formatDateFull: vi.fn((date: string) => `Formatted: ${date}`),
}));

import { HeatmapDayCell } from './heatmap-day-cell';
import { HeatmapTooltip } from './heatmap-tooltip';
import { HeatmapDayLabels } from './heatmap-day-labels';
import { HeatmapLegend } from './heatmap-legend';
import type { HeatmapCell } from '../lib/heatmap-utils';

const createMockCell = (overrides: Partial<HeatmapCell> = {}): HeatmapCell => ({
  date: '2026-02-15',
  dayOfWeek: 0,
  weekIndex: 7,
  minutes: 45,
  sessionCount: 2,
  level: 2,
  ...overrides,
});

const defaultColors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

describe('HeatmapDayCell', () => {
  const defaultProps = {
    cell: createMockCell(),
    colors: defaultColors,
    cellSize: 12,
    gap: 3,
    onHover: vi.fn(),
    onClick: vi.fn(),
  };

  it('renders a rect SVG element', () => {
    const { container } = render(
      <svg>
        <HeatmapDayCell {...defaultProps} />
      </svg>
    );
    const rect = container.querySelector('rect');
    expect(rect).toBeDefined();
    expect(rect).not.toBeNull();
  });

  it('sets correct x and y positions based on weekIndex and dayOfWeek', () => {
    const cell = createMockCell({ weekIndex: 5, dayOfWeek: 3 });
    const { container } = render(
      <svg>
        <HeatmapDayCell {...defaultProps} cell={cell} />
      </svg>
    );
    const rect = container.querySelector('rect');
    // x = weekIndex * (cellSize + gap) = 5 * 15 = 75
    expect(rect?.getAttribute('x')).toBe('75');
    // y = dayOfWeek * (cellSize + gap) = 3 * 15 = 45
    expect(rect?.getAttribute('y')).toBe('45');
  });

  it('sets correct width and height from cellSize', () => {
    const { container } = render(
      <svg>
        <HeatmapDayCell {...defaultProps} cellSize={14} />
      </svg>
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('width')).toBe('14');
    expect(rect?.getAttribute('height')).toBe('14');
  });

  it('uses the correct color based on intensity level', () => {
    const cell = createMockCell({ level: 3 });
    const { container } = render(
      <svg>
        <HeatmapDayCell {...defaultProps} cell={cell} />
      </svg>
    );
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('fill')).toBe('#30a14e');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(
      <svg>
        <HeatmapDayCell {...defaultProps} onClick={onClick} />
      </svg>
    );
    const rect = container.querySelector('rect')!;
    fireEvent.click(rect);
    expect(onClick).toHaveBeenCalledWith(defaultProps.cell);
  });

  it('calls onHover with null on mouse leave', () => {
    const onHover = vi.fn();
    const { container } = render(
      <svg>
        <HeatmapDayCell {...defaultProps} onHover={onHover} />
      </svg>
    );
    const rect = container.querySelector('rect')!;
    fireEvent.mouseLeave(rect);
    expect(onHover).toHaveBeenCalledWith(null, 0, 0);
  });
});

describe('HeatmapTooltip', () => {
  it('renders formatted date', () => {
    const cell = createMockCell({ date: '2026-02-15', minutes: 45, sessionCount: 2 });
    render(<HeatmapTooltip cell={cell} x={100} y={200} />);
    expect(screen.getByText('Formatted: 2026-02-15')).toBeDefined();
  });

  it('shows minutes and session count when minutes > 0', () => {
    const cell = createMockCell({ minutes: 60, sessionCount: 3 });
    render(<HeatmapTooltip cell={cell} x={100} y={200} />);
    expect(screen.getByText('60 minutes (3 sessions)')).toBeDefined();
  });

  it('shows singular session when sessionCount is 1', () => {
    const cell = createMockCell({ minutes: 30, sessionCount: 1 });
    render(<HeatmapTooltip cell={cell} x={100} y={200} />);
    expect(screen.getByText('30 minutes (1 session)')).toBeDefined();
  });

  it('shows no activity when minutes is 0', () => {
    const cell = createMockCell({ minutes: 0, sessionCount: 0 });
    render(<HeatmapTooltip cell={cell} x={100} y={200} />);
    expect(screen.getByText('No study activity')).toBeDefined();
  });

  it('positions tooltip based on x and y props', () => {
    const cell = createMockCell();
    const { container } = render(<HeatmapTooltip cell={cell} x={150} y={250} />);
    const tooltip = container.firstChild as HTMLElement;
    expect(tooltip.style.left).toBe('150px');
    expect(tooltip.style.top).toBe('242px'); // y - 8
  });
});

describe('HeatmapDayLabels', () => {
  it('renders Mon, Wed, Fri labels', () => {
    const { container } = render(
      <svg>
        <HeatmapDayLabels cellSize={12} gap={3} />
      </svg>
    );
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBe(3);
    const labels = Array.from(texts).map((t) => t.textContent);
    expect(labels).toContain('Mon');
    expect(labels).toContain('Wed');
    expect(labels).toContain('Fri');
  });

  it('positions labels at correct y coordinates', () => {
    const { container } = render(
      <svg>
        <HeatmapDayLabels cellSize={12} gap={3} />
      </svg>
    );
    const texts = container.querySelectorAll('text');
    // Mon (day=0): y = 0 * 15 + 6 = 6
    expect(texts[0].getAttribute('y')).toBe('6');
    // Wed (day=2): y = 2 * 15 + 6 = 36
    expect(texts[1].getAttribute('y')).toBe('36');
    // Fri (day=4): y = 4 * 15 + 6 = 66
    expect(texts[2].getAttribute('y')).toBe('66');
  });
});

describe('HeatmapLegend', () => {
  it('renders "Less" and "More" labels', () => {
    render(<HeatmapLegend colors={defaultColors} />);
    expect(screen.getByText('Less')).toBeDefined();
    expect(screen.getByText('More')).toBeDefined();
  });

  it('renders colored squares for each color', () => {
    const { container } = render(<HeatmapLegend colors={defaultColors} />);
    const squares = container.querySelectorAll('.rounded-sm');
    expect(squares.length).toBe(5);
  });

  it('applies correct background colors', () => {
    const { container } = render(<HeatmapLegend colors={defaultColors} />);
    const squares = container.querySelectorAll('.rounded-sm');
    expect((squares[0] as HTMLElement).style.backgroundColor).toBe('rgb(235, 237, 240)');
    expect((squares[4] as HTMLElement).style.backgroundColor).toBe('rgb(33, 110, 57)');
  });
});
