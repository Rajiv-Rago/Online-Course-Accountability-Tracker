import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

import { ChartPeriodToggle } from './chart-period-toggle';

describe('ChartPeriodToggle', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Day, Week, and Month options', () => {
    render(<ChartPeriodToggle value="week" onChange={mockOnChange} />);
    expect(screen.getByText('Day')).toBeDefined();
    expect(screen.getByText('Week')).toBeDefined();
    expect(screen.getByText('Month')).toBeDefined();
  });

  it('passes current value to Tabs component', () => {
    render(<ChartPeriodToggle value="day" onChange={mockOnChange} />);
    const tabs = screen.getByTestId('tabs');
    expect(tabs.getAttribute('data-value')).toBe('day');
  });

  it('calls onChange with "day" when Day tab is clicked', () => {
    render(<ChartPeriodToggle value="week" onChange={mockOnChange} />);
    fireEvent.click(screen.getByTestId('tab-day'));
    expect(mockOnChange).toHaveBeenCalledWith('day');
  });

  it('calls onChange with "week" when Week tab is clicked', () => {
    render(<ChartPeriodToggle value="day" onChange={mockOnChange} />);
    fireEvent.click(screen.getByTestId('tab-week'));
    expect(mockOnChange).toHaveBeenCalledWith('week');
  });

  it('calls onChange with "month" when Month tab is clicked', () => {
    render(<ChartPeriodToggle value="week" onChange={mockOnChange} />);
    fireEvent.click(screen.getByTestId('tab-month'));
    expect(mockOnChange).toHaveBeenCalledWith('month');
  });

  it('reflects the "month" value on Tabs', () => {
    render(<ChartPeriodToggle value="month" onChange={mockOnChange} />);
    const tabs = screen.getByTestId('tabs');
    expect(tabs.getAttribute('data-value')).toBe('month');
  });

  it('renders three tab trigger buttons', () => {
    render(<ChartPeriodToggle value="week" onChange={mockOnChange} />);
    expect(screen.getByTestId('tab-day')).toBeDefined();
    expect(screen.getByTestId('tab-week')).toBeDefined();
    expect(screen.getByTestId('tab-month')).toBeDefined();
  });
});
