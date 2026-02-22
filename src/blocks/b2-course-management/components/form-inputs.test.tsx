import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// --- PrioritySelector ---
import { PrioritySelector } from './priority-selector';

describe('PrioritySelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all four priority options', () => {
    render(<PrioritySelector value={2} onChange={mockOnChange} />);
    expect(screen.getByText('P1')).toBeDefined();
    expect(screen.getByText('P2')).toBeDefined();
    expect(screen.getByText('P3')).toBeDefined();
    expect(screen.getByText('P4')).toBeDefined();
  });

  it('renders priority labels', () => {
    render(<PrioritySelector value={2} onChange={mockOnChange} />);
    expect(screen.getByText('Critical')).toBeDefined();
    expect(screen.getByText('High')).toBeDefined();
    expect(screen.getByText('Medium')).toBeDefined();
    expect(screen.getByText('Low')).toBeDefined();
  });

  it('calls onChange with priority 1 when P1 is clicked', () => {
    render(<PrioritySelector value={2} onChange={mockOnChange} />);
    // P1 button is the one containing text "P1" - find it via the short label
    const p1Buttons = screen.getAllByText('P1');
    // Click the button that contains P1 label
    fireEvent.click(p1Buttons[0].closest('button')!);
    expect(mockOnChange).toHaveBeenCalledWith(1);
  });

  it('calls onChange with priority 4 when P4 is clicked', () => {
    render(<PrioritySelector value={1} onChange={mockOnChange} />);
    const p4Buttons = screen.getAllByText('P4');
    fireEvent.click(p4Buttons[0].closest('button')!);
    expect(mockOnChange).toHaveBeenCalledWith(4);
  });

  it('all buttons have type="button" to prevent form submission', () => {
    render(<PrioritySelector value={2} onChange={mockOnChange} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.getAttribute('type')).toBe('button');
    });
  });

  it('renders selected priority with different styling', () => {
    const { container } = render(<PrioritySelector value={1} onChange={mockOnChange} />);
    const buttons = container.querySelectorAll('button');
    // The first button (P1) should have "font-semibold" and "border-current"
    const p1Button = buttons[0];
    expect(p1Button.className).toContain('border-current');
  });
});

// --- PlatformSelect ---
// PlatformSelect uses shadcn Select which renders a Radix trigger
vi.mock('./platform-icon', () => ({
  PlatformIcon: ({ platform }: { platform: string | null }) => (
    <span data-testid={`platform-icon-${platform || 'null'}`}>icon</span>
  ),
}));

import { PlatformSelect } from './platform-select';

describe('PlatformSelect', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with null value', () => {
    render(<PlatformSelect value={null} onChange={mockOnChange} />);
    expect(screen.getByText('Select a platform')).toBeDefined();
  });

  it('renders trigger with placeholder when no value', () => {
    render(<PlatformSelect value={null} onChange={mockOnChange} />);
    expect(screen.getByText('Select a platform')).toBeDefined();
  });

  it('shows platform name when a value is selected', () => {
    render(<PlatformSelect value="udemy" onChange={mockOnChange} />);
    expect(screen.getByText('Udemy')).toBeDefined();
  });

  it('shows platform icon for selected value', () => {
    render(<PlatformSelect value="udemy" onChange={mockOnChange} />);
    expect(screen.getByTestId('platform-icon-udemy')).toBeDefined();
  });

  it('renders with coursera value', () => {
    render(<PlatformSelect value="coursera" onChange={mockOnChange} />);
    expect(screen.getByText('Coursera')).toBeDefined();
  });

  it('renders with youtube value', () => {
    render(<PlatformSelect value="youtube" onChange={mockOnChange} />);
    expect(screen.getByText('YouTube')).toBeDefined();
  });
});
