import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock the lib dependencies
vi.mock('../lib/timezones', () => ({
  getTimezoneLabel: vi.fn((tz: string) => {
    if (tz === 'America/New_York') return 'New York (GMT-5)';
    if (tz === 'UTC') return 'UTC';
    return tz;
  }),
}));

vi.mock('../lib/motivation-styles', () => ({
  getMotivationStyleInfo: vi.fn((style: string) => {
    const styles: Record<string, { label: string }> = {
      gentle: { label: 'Gentle' },
      balanced: { label: 'Balanced' },
      drill_sergeant: { label: 'Drill Sergeant' },
    };
    return styles[style] ?? { label: 'Balanced' };
  }),
}));

import { OnboardingStepComplete } from './onboarding-step-complete';

describe('OnboardingStepComplete', () => {
  const fullData = {
    display_name: 'Alice',
    experience_level: 'intermediate' as const,
    learning_goals: ['Career advancement', 'Learn Rust'],
    preferred_days: ['mon', 'wed', 'fri'] as const,
    preferred_time_start: '08:00',
    preferred_time_end: '12:00',
    daily_study_goal_mins: 90,
    weekly_study_goal_mins: 420,
    motivation_style: 'balanced' as const,
    timezone: 'America/New_York',
  };

  it('renders personalized heading with display name', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText(/You're all set.*Alice/)).toBeDefined();
  });

  it('renders heading without name when display_name is empty', () => {
    render(<OnboardingStepComplete data={{ ...fullData, display_name: '' }} />);
    expect(screen.getByText(/You're all set!/)).toBeDefined();
  });

  it('renders summary text', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText(/summary of your preferences/)).toBeDefined();
  });

  it('displays the name', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('displays the experience level capitalized', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText('Intermediate')).toBeDefined();
  });

  it('displays learning goals joined by comma', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText('Career advancement, Learn Rust')).toBeDefined();
  });

  it('displays preferred days abbreviated', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText('Mon, Wed, Fri')).toBeDefined();
  });

  it('displays study window times', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText(/08:00.*12:00/)).toBeDefined();
  });

  it('displays daily goal', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText('90 min')).toBeDefined();
  });

  it('displays weekly goal with hours', () => {
    render(<OnboardingStepComplete data={fullData} />);
    // 420 / 60 = 7h
    expect(screen.getByText('420 min (7h)')).toBeDefined();
  });

  it('displays motivation style label', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText('Balanced')).toBeDefined();
  });

  it('displays timezone label', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText('New York (GMT-5)')).toBeDefined();
  });

  it('shows dash for missing goals', () => {
    const data = { ...fullData, learning_goals: undefined };
    render(<OnboardingStepComplete data={data} />);
    // Should show "—" for missing data
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('displays settings change reminder', () => {
    render(<OnboardingStepComplete data={fullData} />);
    expect(screen.getByText(/change these anytime in Settings/)).toBeDefined();
  });
});
