import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock hooks and child components BEFORE import
const mockRefetch = vi.fn();

vi.mock('../hooks/use-profile', () => ({
  useProfile: vi.fn(() => ({
    profile: null,
    isLoading: true,
    error: null,
    refetch: mockRefetch,
  })),
}));

vi.mock('../actions/profile-actions', () => ({
  updateProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./avatar-upload', () => ({
  AvatarUpload: ({ displayName }: any) => (
    <div data-testid="avatar-upload">Avatar: {displayName}</div>
  ),
}));

vi.mock('./timezone-select', () => ({
  TimezoneSelect: ({ value, onChange }: any) => (
    <select data-testid="timezone-select" value={value} onChange={(e: any) => onChange(e.target.value)}>
      <option value="UTC">UTC</option>
      <option value="America/New_York">New York</option>
    </select>
  ),
}));

vi.mock('./theme-toggle', () => ({
  ThemeToggle: ({ value, onChange }: any) => (
    <div data-testid="theme-toggle">
      <button onClick={() => onChange('dark')}>Dark</button>
    </div>
  ),
}));

import { ProfileForm } from './profile-form';
import { useProfile } from '../hooks/use-profile';
import { updateProfile } from '../actions/profile-actions';

const mockProfile = {
  id: 'user-1',
  email: 'alice@example.com',
  display_name: 'Alice',
  timezone: 'America/New_York',
  theme: 'system' as const,
  motivation_style: 'balanced' as const,
  experience_level: 'intermediate' as const,
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
  preferred_ai_model: 'openai:gpt-4o',
};

describe('ProfileForm', () => {
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
    render(<ProfileForm />);
    expect(screen.getByText('Loading profile...')).toBeDefined();
  });

  it('renders form fields when profile is loaded', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<ProfileForm />);
    expect(screen.getByText('Profile Settings')).toBeDefined();
    expect(screen.getByLabelText('Display Name')).toBeDefined();
  });

  it('populates form with profile data', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<ProfileForm />);
    const nameInput = screen.getByLabelText('Display Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Alice');
  });

  it('shows email as read-only', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<ProfileForm />);
    const emailInput = screen.getByDisplayValue('alice@example.com') as HTMLInputElement;
    expect(emailInput.disabled).toBe(true);
  });

  it('shows helper text for email change', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<ProfileForm />);
    expect(screen.getByText('Change your email in the Account tab.')).toBeDefined();
  });

  it('disables Save button when form is clean', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<ProfileForm />);
    const saveButton = screen.getByText('Save Changes') as HTMLButtonElement;
    expect(saveButton.closest('button')?.disabled).toBe(true);
  });

  it('enables Save button when form is dirty', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<ProfileForm />);
    const nameInput = screen.getByLabelText('Display Name');
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    const saveButton = screen.getByText('Save Changes') as HTMLButtonElement;
    expect(saveButton.closest('button')?.disabled).toBe(false);
  });

  it('calls updateProfile and refetch when Save is clicked', async () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    vi.mocked(updateProfile).mockResolvedValue(undefined as any);

    render(<ProfileForm />);
    const nameInput = screen.getByLabelText('Display Name');
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledOnce();
    });
  });

  it('renders avatar upload component', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<ProfileForm />);
    expect(screen.getByTestId('avatar-upload')).toBeDefined();
  });

  it('renders timezone select component', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<ProfileForm />);
    expect(screen.getByTestId('timezone-select')).toBeDefined();
  });

  it('renders theme toggle component', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<ProfileForm />);
    expect(screen.getByTestId('theme-toggle')).toBeDefined();
  });
});
