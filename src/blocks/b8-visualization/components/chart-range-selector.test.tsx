import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSetRange = vi.fn();
const mockSetCustomRange = vi.fn();

vi.mock('../hooks/use-chart-range', () => ({
  useChartRange: vi.fn(() => ({
    range: '30d',
    setRange: mockSetRange,
    setCustomRange: mockSetCustomRange,
    dateRange: {
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-02-01T00:00:00.000Z',
    },
  })),
}));

// Store the Tabs onValueChange callback so TabsTrigger can call it
let tabsOnValueChange: ((v: string) => void) | undefined;

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => {
    tabsOnValueChange = onValueChange;
    return (
      <div data-testid="tabs" data-value={value}>
        {children}
      </div>
    );
  },
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`} onClick={() => tabsOnValueChange?.(value)}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: any) => <div data-testid="popover" data-open={open}>{children}</div>,
  PopoverTrigger: ({ children, asChild }: any) => <div data-testid="popover-trigger">{asChild ? children : <button>{children}</button>}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected, mode }: any) => (
    <div data-testid="calendar" data-mode={mode} data-selected={selected?.toISOString?.() ?? ''}>
      <button data-testid="select-date" onClick={() => onSelect?.(new Date('2026-01-15'))}>
        Select Date
      </button>
    </div>
  ),
}));

import { ChartRangeSelector } from './chart-range-selector';
import { useChartRange } from '../hooks/use-chart-range';

describe('ChartRangeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all preset tabs (7d, 30d, 90d, 1y, All)', () => {
    render(<ChartRangeSelector />);
    expect(screen.getByTestId('tab-7d')).toBeDefined();
    expect(screen.getByTestId('tab-30d')).toBeDefined();
    expect(screen.getByTestId('tab-90d')).toBeDefined();
    expect(screen.getByTestId('tab-1y')).toBeDefined();
    expect(screen.getByTestId('tab-all')).toBeDefined();
  });

  it('renders preset labels correctly', () => {
    render(<ChartRangeSelector />);
    expect(screen.getByText('7d')).toBeDefined();
    expect(screen.getByText('30d')).toBeDefined();
    expect(screen.getByText('90d')).toBeDefined();
    expect(screen.getByText('1y')).toBeDefined();
    expect(screen.getByText('All')).toBeDefined();
  });

  it('renders the Custom button', () => {
    render(<ChartRangeSelector />);
    expect(screen.getByText('Custom')).toBeDefined();
  });

  it('calls setRange when a preset tab is clicked', () => {
    render(<ChartRangeSelector />);
    // Click on the 7d tab - triggers onValueChange on Tabs
    fireEvent.click(screen.getByTestId('tab-7d'));
    expect(mockSetRange).toHaveBeenCalledWith('7d');
  });

  it('shows popover content with start and end date labels', () => {
    render(<ChartRangeSelector />);
    expect(screen.getByText('Start Date')).toBeDefined();
    expect(screen.getByText('End Date')).toBeDefined();
  });

  it('renders the Apply button for custom date range', () => {
    render(<ChartRangeSelector />);
    expect(screen.getByText('Apply')).toBeDefined();
  });

  it('Apply button is disabled when no dates are selected', () => {
    render(<ChartRangeSelector />);
    const applyButton = screen.getByText('Apply');
    expect(applyButton.hasAttribute('disabled')).toBe(true);
  });

  it('sets tabs value to empty string when range is custom', () => {
    vi.mocked(useChartRange).mockReturnValue({
      range: 'custom',
      setRange: mockSetRange,
      setCustomRange: mockSetCustomRange,
      dateRange: {
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-02-01T00:00:00.000Z',
      },
    });
    render(<ChartRangeSelector />);
    const tabs = screen.getByTestId('tabs');
    expect(tabs.getAttribute('data-value')).toBe('');
  });

  it('renders two calendars for custom date selection', () => {
    render(<ChartRangeSelector />);
    const calendars = screen.getAllByTestId('calendar');
    expect(calendars.length).toBe(2);
  });
});
