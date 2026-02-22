import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StreakFreezeButton } from './streak-freeze-button';

describe('StreakFreezeButton', () => {
  const defaultProps = {
    freezeCount: 3,
    onFreeze: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the freeze button with count', () => {
    render(<StreakFreezeButton {...defaultProps} />);
    expect(screen.getByText('Use Freeze (3)')).toBeDefined();
  });

  it('is enabled when freezeCount > 0 and not loading', () => {
    render(<StreakFreezeButton {...defaultProps} />);
    const btn = screen.getByText('Use Freeze (3)').closest('button');
    expect(btn?.disabled).toBe(false);
  });

  it('is disabled when freezeCount is 0', () => {
    render(<StreakFreezeButton {...defaultProps} freezeCount={0} />);
    const btn = screen.getByText('Use Freeze (0)').closest('button');
    expect(btn?.disabled).toBe(true);
  });

  it('is disabled when isLoading is true', () => {
    render(<StreakFreezeButton {...defaultProps} isLoading={true} />);
    const btn = screen.getByText('Use Freeze (3)').closest('button');
    expect(btn?.disabled).toBe(true);
  });

  it('opens confirmation dialog when button is clicked', () => {
    render(<StreakFreezeButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Use Freeze (3)'));
    expect(screen.getByText('Use Streak Freeze?')).toBeDefined();
    expect(screen.getByText(/This will apply a streak freeze for yesterday/)).toBeDefined();
  });

  it('shows correct remaining freeze count in dialog', () => {
    render(<StreakFreezeButton {...defaultProps} freezeCount={3} />);
    fireEvent.click(screen.getByText('Use Freeze (3)'));
    expect(screen.getByText(/You have 3 freezes remaining/)).toBeDefined();
  });

  it('uses singular "freeze" when count is 1', () => {
    render(<StreakFreezeButton {...defaultProps} freezeCount={1} />);
    fireEvent.click(screen.getByText('Use Freeze (1)'));
    expect(screen.getByText(/You have 1 freeze remaining/)).toBeDefined();
  });

  it('calls onFreeze and closes dialog when Use Freeze is confirmed', () => {
    render(<StreakFreezeButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Use Freeze (3)'));

    // The dialog has a "Use Freeze" confirmation button (not the outer button)
    const dialogButtons = screen.getAllByText('Use Freeze');
    // Click the confirmation button inside the dialog (not the outer one)
    const confirmButton = dialogButtons.find(
      (el) => el.closest('[role="dialog"]') !== null
    );
    if (confirmButton) {
      fireEvent.click(confirmButton);
    }

    expect(defaultProps.onFreeze).toHaveBeenCalledTimes(1);
  });

  it('closes dialog when Cancel is clicked without calling onFreeze', () => {
    render(<StreakFreezeButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Use Freeze (3)'));
    expect(screen.getByText('Use Streak Freeze?')).toBeDefined();

    fireEvent.click(screen.getByText('Cancel'));
    // Dialog should close (title not visible)
    expect(screen.queryByText('Use Streak Freeze?')).toBeNull();
    expect(defaultProps.onFreeze).not.toHaveBeenCalled();
  });

  it('shows "Applying..." when isLoading during dialog confirmation', () => {
    const onFreeze = vi.fn();
    const { rerender } = render(
      <StreakFreezeButton freezeCount={3} onFreeze={onFreeze} isLoading={false} />
    );
    // Open the dialog first
    fireEvent.click(screen.getByText('Use Freeze (3)'));
    expect(screen.getByText('Use Streak Freeze?')).toBeDefined();

    // Now rerender with isLoading true to simulate loading state
    rerender(
      <StreakFreezeButton freezeCount={3} onFreeze={onFreeze} isLoading={true} />
    );
    expect(screen.getByText('Applying...')).toBeDefined();
  });
});
