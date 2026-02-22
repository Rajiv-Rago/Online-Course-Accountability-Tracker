import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TimerDisplay } from './timer-display';

describe('TimerDisplay', () => {
  it('formats 0 seconds as 00:00:00', () => {
    render(<TimerDisplay elapsedSeconds={0} isRunning={false} />);
    expect(screen.getByText('00:00:00')).toBeDefined();
  });

  it('formats 61 seconds as 00:01:01', () => {
    render(<TimerDisplay elapsedSeconds={61} isRunning={false} />);
    expect(screen.getByText('00:01:01')).toBeDefined();
  });

  it('formats 3661 seconds as 01:01:01', () => {
    render(<TimerDisplay elapsedSeconds={3661} isRunning={true} />);
    expect(screen.getByText('01:01:01')).toBeDefined();
  });

  it('formats 3600 seconds as 01:00:00', () => {
    render(<TimerDisplay elapsedSeconds={3600} isRunning={true} />);
    expect(screen.getByText('01:00:00')).toBeDefined();
  });

  it('formats 5 seconds as 00:00:05', () => {
    render(<TimerDisplay elapsedSeconds={5} isRunning={true} />);
    expect(screen.getByText('00:00:05')).toBeDefined();
  });

  it('applies animate-pulse class when isRunning is true', () => {
    const { container } = render(<TimerDisplay elapsedSeconds={10} isRunning={true} />);
    const timerEl = container.querySelector('.animate-pulse');
    expect(timerEl).toBeDefined();
    expect(timerEl).not.toBeNull();
  });

  it('does not apply animate-pulse when isRunning is false', () => {
    const { container } = render(<TimerDisplay elapsedSeconds={10} isRunning={false} />);
    const timerEl = container.querySelector('.animate-pulse');
    expect(timerEl).toBeNull();
  });

  it('shows "Paused" label when not running and elapsed > 0', () => {
    render(<TimerDisplay elapsedSeconds={120} isRunning={false} />);
    expect(screen.getByText('Paused')).toBeDefined();
  });

  it('does not show "Paused" label when elapsed is 0', () => {
    render(<TimerDisplay elapsedSeconds={0} isRunning={false} />);
    expect(screen.queryByText('Paused')).toBeNull();
  });

  it('does not show "Paused" label when isRunning is true', () => {
    render(<TimerDisplay elapsedSeconds={120} isRunning={true} />);
    expect(screen.queryByText('Paused')).toBeNull();
  });

  it('formats large time values correctly (10h+)', () => {
    render(<TimerDisplay elapsedSeconds={36000} isRunning={false} />);
    expect(screen.getByText('10:00:00')).toBeDefined();
  });
});
