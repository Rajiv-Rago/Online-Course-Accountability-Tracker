import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { useTheme } from 'next-themes';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  const mockSetTheme = vi.fn();
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTheme).mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
      themes: ['light', 'dark', 'system'],
      systemTheme: 'light',
      forcedTheme: undefined,
    });
  });

  it('renders all 3 theme buttons', () => {
    render(<ThemeToggle />);
    expect(screen.getByText('Light')).toBeDefined();
    expect(screen.getByText('Dark')).toBeDefined();
    expect(screen.getByText('System')).toBeDefined();
  });

  it('calls setTheme when Light is clicked', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByText('Light'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme when Dark is clicked', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByText('Dark'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme when System is clicked', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByText('System'));
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });

  it('calls onChange callback when provided', () => {
    render(<ThemeToggle value="light" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Dark'));
    expect(mockOnChange).toHaveBeenCalledWith('dark');
  });

  it('uses value prop as current when provided', () => {
    render(<ThemeToggle value="dark" onChange={mockOnChange} />);
    // The dark button should have active styling (bg-background shadow-sm)
    const darkBtn = screen.getByText('Dark').closest('button');
    expect(darkBtn?.className).toContain('bg-background');
  });

  it('falls back to theme from useTheme when no value prop', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
      themes: ['light', 'dark', 'system'],
      systemTheme: 'light',
      forcedTheme: undefined,
    });
    render(<ThemeToggle />);
    const lightBtn = screen.getByText('Light').closest('button');
    expect(lightBtn?.className).toContain('bg-background');
  });

  it('renders as a button group', () => {
    render(<ThemeToggle />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });
});
