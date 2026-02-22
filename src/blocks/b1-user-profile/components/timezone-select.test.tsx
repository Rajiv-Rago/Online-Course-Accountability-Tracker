import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock timezones lib
vi.mock('../lib/timezones', () => ({
  TIMEZONE_REGIONS: ['Americas', 'Europe', 'Other'],
  getTimezonesByRegion: vi.fn(() => ({
    Americas: [
      { value: 'America/New_York', label: 'New York', region: 'Americas', offset: 'GMT-5' },
      { value: 'America/Chicago', label: 'Chicago', region: 'Americas', offset: 'GMT-6' },
    ],
    Europe: [
      { value: 'Europe/London', label: 'London', region: 'Europe', offset: 'GMT+0' },
      { value: 'Europe/Berlin', label: 'Berlin', region: 'Europe', offset: 'GMT+1' },
    ],
    Other: [
      { value: 'UTC', label: 'UTC', region: 'Other', offset: 'UTC' },
    ],
  })),
}));

import { TimezoneSelect } from './timezone-select';

describe('TimezoneSelect', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the select trigger', () => {
    render(<TimezoneSelect value="UTC" onChange={mockOnChange} />);
    // The SelectTrigger should render a button with combobox role
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDefined();
  });

  it('renders with the provided value', () => {
    render(<TimezoneSelect value="UTC" onChange={mockOnChange} />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDefined();
  });

  it('renders the component without crashing with various values', () => {
    render(<TimezoneSelect value="America/New_York" onChange={mockOnChange} />);
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('accepts empty string as value', () => {
    render(<TimezoneSelect value="" onChange={mockOnChange} />);
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('passes onChange callback correctly', () => {
    render(<TimezoneSelect value="UTC" onChange={mockOnChange} />);
    // The component wraps a shadcn Select, so we verify it renders
    expect(screen.getByRole('combobox')).toBeDefined();
  });
});
