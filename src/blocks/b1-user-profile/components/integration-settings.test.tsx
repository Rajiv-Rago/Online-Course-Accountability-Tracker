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
  updateWebhookUrls: vi.fn().mockResolvedValue(undefined),
  testSlackWebhook: vi.fn().mockResolvedValue({ success: true }),
  testDiscordWebhook: vi.fn().mockResolvedValue({ success: true }),
}));

import { IntegrationSettings } from './integration-settings';
import { useProfile } from '../hooks/use-profile';
import {
  updateWebhookUrls,
  testSlackWebhook,
  testDiscordWebhook,
} from '../actions/notification-actions';

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
};

describe('IntegrationSettings', () => {
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
    render(<IntegrationSettings />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders heading when loaded', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    expect(screen.getByText('Integrations')).toBeDefined();
  });

  it('renders Slack Integration section', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    expect(screen.getByText('Slack Integration')).toBeDefined();
    expect(screen.getByPlaceholderText('https://hooks.slack.com/services/...')).toBeDefined();
  });

  it('renders Discord Integration section', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    expect(screen.getByText('Discord Integration')).toBeDefined();
    expect(screen.getByPlaceholderText('https://discord.com/api/webhooks/...')).toBeDefined();
  });

  it('shows "Not connected" badge when no webhook URL', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    const badges = screen.getAllByText('Not connected');
    expect(badges.length).toBe(2);
  });

  it('shows "Connected" badge when webhook URL exists', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: {
        ...mockProfile,
        slack_webhook_url: 'https://hooks.slack.com/services/abc',
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    expect(screen.getByText('Connected')).toBeDefined();
  });

  it('disables Test buttons when no URL is entered', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    const testButtons = screen.getAllByText('Test');
    testButtons.forEach((btn) => {
      expect((btn.closest('button') as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('enables Test button when URL is entered', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    const slackInput = screen.getByPlaceholderText('https://hooks.slack.com/services/...');
    fireEvent.change(slackInput, { target: { value: 'https://hooks.slack.com/services/abc' } });
    const testButtons = screen.getAllByText('Test');
    // First test button (Slack) should now be enabled
    expect((testButtons[0].closest('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls testSlackWebhook when Slack Test button is clicked', async () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    const slackInput = screen.getByPlaceholderText('https://hooks.slack.com/services/...');
    fireEvent.change(slackInput, { target: { value: 'https://hooks.slack.com/services/abc' } });
    const testButtons = screen.getAllByText('Test');
    fireEvent.click(testButtons[0]);
    await waitFor(() => {
      expect(testSlackWebhook).toHaveBeenCalledWith('https://hooks.slack.com/services/abc');
    });
  });

  it('calls updateWebhookUrls on Save', async () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    fireEvent.click(screen.getByText('Save Integrations'));
    await waitFor(() => {
      expect(updateWebhookUrls).toHaveBeenCalledOnce();
    });
  });

  it('renders webhook setup instructions', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    expect(screen.getByText('How to set up webhooks')).toBeDefined();
  });

  it('renders description text', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<IntegrationSettings />);
    expect(screen.getByText('Connect external services to receive notifications.')).toBeDefined();
  });
});
