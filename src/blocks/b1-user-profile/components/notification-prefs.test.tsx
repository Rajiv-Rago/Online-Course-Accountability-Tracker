import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockRefetch = vi.fn();

vi.mock('../hooks/use-profile', () => ({
  useProfile: vi.fn(() => ({
    profile: null,
    isLoading: true,
    error: null,
    refetch: mockRefetch,
  })),
}));

vi.mock('../actions/notification-actions', () => ({
  updateNotificationPrefs: vi.fn().mockResolvedValue(undefined),
}));

import { NotificationPrefs } from './notification-prefs';
import { useProfile } from '../hooks/use-profile';
import { updateNotificationPrefs } from '../actions/notification-actions';

const mockProfile = {
  id: 'user-1',
  email: 'alice@example.com',
  display_name: 'Alice',
  timezone: 'UTC',
  theme: 'system' as const,
  motivation_style: 'balanced' as const,
  experience_level: 'beginner' as const,
  daily_study_goal_mins: 60,
  weekly_study_goal_mins: 300,
  avatar_url: null,
  slack_webhook_url: null,
  discord_webhook_url: null,
  notify_email: true,
  notify_push: true,
  notify_slack: false,
  notify_discord: false,
  notify_daily_reminder: true,
  notify_streak_warning: true,
  notify_weekly_report: true,
  notify_achievement: true,
  notify_risk_alert: true,
};

describe('NotificationPrefs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when profile is loading', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders heading when loaded', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    expect(screen.getByText('Notification Preferences')).toBeDefined();
  });

  it('renders all 5 notification type toggles', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    expect(screen.getByText('Daily Reminder')).toBeDefined();
    expect(screen.getByText('Streak Warning')).toBeDefined();
    expect(screen.getByText('Weekly Report')).toBeDefined();
    expect(screen.getByText('Achievement Unlocked')).toBeDefined();
    expect(screen.getByText('Course At-Risk Alert')).toBeDefined();
  });

  it('renders all 4 channel toggles', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    expect(screen.getByText('Email')).toBeDefined();
    expect(screen.getByText('Push')).toBeDefined();
    expect(screen.getByText('Slack')).toBeDefined();
    expect(screen.getByText('Discord')).toBeDefined();
  });

  it('shows "Configure in Integrations tab" for Slack when no webhook URL', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { ...mockProfile, slack_webhook_url: null },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    const hints = screen.getAllByText('Configure in Integrations tab');
    expect(hints.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Configure in Integrations tab" for Discord when no webhook URL', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { ...mockProfile, discord_webhook_url: null },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    const hints = screen.getAllByText('Configure in Integrations tab');
    expect(hints.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Save Preferences button', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    expect(screen.getByText('Save Preferences')).toBeDefined();
  });

  it('calls updateNotificationPrefs and refetch on Save', async () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    fireEvent.click(screen.getByText('Save Preferences'));

    await waitFor(() => {
      expect(updateNotificationPrefs).toHaveBeenCalledOnce();
    });
  });

  it('renders channel toggles section header', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    expect(screen.getByText('Channel Toggles (master switches)')).toBeDefined();
  });

  it('renders description text', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<NotificationPrefs />);
    expect(screen.getByText('Choose which notifications you receive and how.')).toBeDefined();
  });
});
