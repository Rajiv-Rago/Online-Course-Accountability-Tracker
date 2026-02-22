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

vi.mock('../actions/profile-actions', () => ({
  updatePreferredAiModel: vi.fn().mockResolvedValue(undefined),
}));

import { AiModelSelect } from './ai-model-select';
import { useProfile } from '../hooks/use-profile';
import { updatePreferredAiModel } from '../actions/profile-actions';

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
  preferred_ai_model: 'openai:gpt-4o',
};

describe('AiModelSelect', () => {
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
    render(<AiModelSelect />);
    expect(screen.getByText('Loading preferences...')).toBeDefined();
  });

  it('renders heading when loaded', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AiModelSelect />);
    expect(screen.getByText('AI Model')).toBeDefined();
  });

  it('renders description text', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AiModelSelect />);
    expect(
      screen.getByText(/Choose which AI model powers your course analysis/)
    ).toBeDefined();
  });

  it('renders model info card with current model details', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AiModelSelect />);
    // From the global mock, GPT-4o is present (may appear in both SelectValue and info card)
    const matches = screen.getAllByText('GPT-4o');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders provider label in model info card', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AiModelSelect />);
    expect(screen.getByText(/Provider:.*OpenAI/)).toBeDefined();
  });

  it('renders the Preferred Model label', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AiModelSelect />);
    expect(screen.getByText('Preferred Model')).toBeDefined();
  });

  it('renders fallback info text', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AiModelSelect />);
    expect(
      screen.getByText(/automatically falls back to the next available provider/)
    ).toBeDefined();
  });

  it('disables Save button when no changes made', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AiModelSelect />);
    const saveButton = screen.getByText('Save Changes').closest('button') as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  it('renders the select trigger for model dropdown', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AiModelSelect />);
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('renders model tier badge', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AiModelSelect />);
    // The model info card shows the tier badge (may also appear in SelectValue)
    const matches = screen.getAllByText('premium');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
