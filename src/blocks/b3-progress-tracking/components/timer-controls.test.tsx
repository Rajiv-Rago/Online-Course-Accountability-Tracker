import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TimerControls } from './timer-controls';

describe('TimerControls', () => {
  const defaultProps = {
    status: 'idle' as const,
    onStart: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onStop: vi.fn(),
    courseSelected: true,
    isStopLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Start button when status is idle', () => {
    render(<TimerControls {...defaultProps} />);
    expect(screen.getByText('Start')).toBeDefined();
  });

  it('disables Start button when no course is selected', () => {
    render(<TimerControls {...defaultProps} courseSelected={false} />);
    const startBtn = screen.getByText('Start').closest('button');
    expect(startBtn?.disabled).toBe(true);
  });

  it('enables Start button when course is selected', () => {
    render(<TimerControls {...defaultProps} courseSelected={true} />);
    const startBtn = screen.getByText('Start').closest('button');
    expect(startBtn?.disabled).toBe(false);
  });

  it('calls onStart when Start button is clicked', () => {
    render(<TimerControls {...defaultProps} />);
    fireEvent.click(screen.getByText('Start'));
    expect(defaultProps.onStart).toHaveBeenCalledTimes(1);
  });

  it('renders Pause and Stop & Save buttons when status is running', () => {
    render(<TimerControls {...defaultProps} status="running" />);
    expect(screen.getByText('Pause')).toBeDefined();
    expect(screen.getByText('Stop & Save')).toBeDefined();
  });

  it('does not show Start button when running', () => {
    render(<TimerControls {...defaultProps} status="running" />);
    expect(screen.queryByText('Start')).toBeNull();
  });

  it('calls onPause when Pause is clicked while running', () => {
    render(<TimerControls {...defaultProps} status="running" />);
    fireEvent.click(screen.getByText('Pause'));
    expect(defaultProps.onPause).toHaveBeenCalledTimes(1);
  });

  it('renders Resume and Stop & Save when status is paused', () => {
    render(<TimerControls {...defaultProps} status="paused" />);
    expect(screen.getByText('Resume')).toBeDefined();
    expect(screen.getByText('Stop & Save')).toBeDefined();
  });

  it('calls onResume when Resume is clicked while paused', () => {
    render(<TimerControls {...defaultProps} status="paused" />);
    fireEvent.click(screen.getByText('Resume'));
    expect(defaultProps.onResume).toHaveBeenCalledTimes(1);
  });

  it('calls onStop when Stop & Save is clicked', () => {
    render(<TimerControls {...defaultProps} status="running" />);
    fireEvent.click(screen.getByText('Stop & Save'));
    expect(defaultProps.onStop).toHaveBeenCalledTimes(1);
  });

  it('shows "Saving..." and disables Stop button when isStopLoading is true', () => {
    render(<TimerControls {...defaultProps} status="running" isStopLoading={true} />);
    expect(screen.getByText('Saving...')).toBeDefined();
    expect(screen.queryByText('Stop & Save')).toBeNull();
    const savingBtn = screen.getByText('Saving...').closest('button');
    expect(savingBtn?.disabled).toBe(true);
  });

  it('does not show Pause when status is idle', () => {
    render(<TimerControls {...defaultProps} status="idle" />);
    expect(screen.queryByText('Pause')).toBeNull();
    expect(screen.queryByText('Resume')).toBeNull();
    expect(screen.queryByText('Stop & Save')).toBeNull();
  });
});
