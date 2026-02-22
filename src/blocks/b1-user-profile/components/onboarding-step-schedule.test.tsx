import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock timezones lib to avoid complex offset calculations in tests
vi.mock('../lib/timezones', () => ({
  TIMEZONE_REGIONS: ['Americas', 'Europe'],
  getTimezonesByRegion: vi.fn(() => ({
    Americas: [
      { value: 'America/New_York', label: 'New York', region: 'Americas', offset: 'GMT-5' },
      { value: 'America/Chicago', label: 'Chicago', region: 'Americas', offset: 'GMT-6' },
    ],
    Europe: [
      { value: 'Europe/London', label: 'London', region: 'Europe', offset: 'GMT+0' },
    ],
  })),
}));

import { OnboardingStepSchedule } from './onboarding-step-schedule';

describe('OnboardingStepSchedule', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    data: {
      preferred_days: [] as string[],
      preferred_time_start: '09:00',
      preferred_time_end: '17:00',
      daily_study_goal_mins: 60,
      weekly_study_goal_mins: 300,
      timezone: 'UTC',
    },
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    expect(screen.getByText('When do you prefer to study?')).toBeDefined();
  });

  it('renders all 7 day labels', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    expect(screen.getByText('Mon')).toBeDefined();
    expect(screen.getByText('Tue')).toBeDefined();
    expect(screen.getByText('Wed')).toBeDefined();
    expect(screen.getByText('Thu')).toBeDefined();
    expect(screen.getByText('Fri')).toBeDefined();
    expect(screen.getByText('Sat')).toBeDefined();
    expect(screen.getByText('Sun')).toBeDefined();
  });

  it('calls onChange with toggled day when a day checkbox is clicked', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    fireEvent.click(screen.getByText('Mon'));
    expect(mockOnChange).toHaveBeenCalledWith({
      preferred_days: ['mon'],
    });
  });

  it('removes a day when it is already selected and clicked', () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, preferred_days: ['mon', 'wed'] },
    };
    render(<OnboardingStepSchedule {...props} />);
    fireEvent.click(screen.getByText('Mon'));
    expect(mockOnChange).toHaveBeenCalledWith({
      preferred_days: ['wed'],
    });
  });

  it('renders study window start and end time inputs', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    expect(screen.getByLabelText('Study window start')).toBeDefined();
    expect(screen.getByLabelText('Study window end')).toBeDefined();
  });

  it('calls onChange when start time changes', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    const startInput = screen.getByLabelText('Study window start');
    fireEvent.change(startInput, { target: { value: '10:00' } });
    expect(mockOnChange).toHaveBeenCalledWith({ preferred_time_start: '10:00' });
  });

  it('calls onChange when end time changes', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    const endInput = screen.getByLabelText('Study window end');
    fireEvent.change(endInput, { target: { value: '20:00' } });
    expect(mockOnChange).toHaveBeenCalledWith({ preferred_time_end: '20:00' });
  });

  it('renders daily and weekly goal number inputs', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    expect(screen.getByLabelText('Daily study goal (min)')).toBeDefined();
    expect(screen.getByLabelText('Weekly study goal (min)')).toBeDefined();
  });

  it('calls onChange when daily goal changes', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    const dailyInput = screen.getByLabelText('Daily study goal (min)');
    fireEvent.change(dailyInput, { target: { value: '90' } });
    expect(mockOnChange).toHaveBeenCalledWith({ daily_study_goal_mins: 90 });
  });

  it('calls onChange when weekly goal changes', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    const weeklyInput = screen.getByLabelText('Weekly study goal (min)');
    fireEvent.change(weeklyInput, { target: { value: '420' } });
    expect(mockOnChange).toHaveBeenCalledWith({ weekly_study_goal_mins: 420 });
  });

  it('displays hours/week computation text', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    // 300 min / 60 = 5 hours
    expect(screen.getByText('5 hours/week')).toBeDefined();
  });

  it('renders timezone label', () => {
    render(<OnboardingStepSchedule {...defaultProps} />);
    expect(screen.getByText('Timezone')).toBeDefined();
  });
});
