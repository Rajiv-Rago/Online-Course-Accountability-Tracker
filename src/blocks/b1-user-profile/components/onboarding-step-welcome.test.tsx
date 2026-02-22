import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { OnboardingStepWelcome } from './onboarding-step-welcome';

describe('OnboardingStepWelcome', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    data: { display_name: '', experience_level: 'beginner' as const },
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the welcome heading', () => {
    render(<OnboardingStepWelcome {...defaultProps} />);
    expect(screen.getByText('Welcome to Course Accountability Tracker!')).toBeDefined();
  });

  it('renders the description text', () => {
    render(<OnboardingStepWelcome {...defaultProps} />);
    expect(
      screen.getByText(/set up your profile so we can help you stay on track/)
    ).toBeDefined();
  });

  it('renders name input with label', () => {
    render(<OnboardingStepWelcome {...defaultProps} />);
    expect(screen.getByLabelText('What should we call you?')).toBeDefined();
  });

  it('populates name input from data prop', () => {
    const props = {
      data: { display_name: 'Alice', experience_level: 'beginner' as const },
      onChange: mockOnChange,
    };
    render(<OnboardingStepWelcome {...props} />);
    const input = screen.getByLabelText('What should we call you?') as HTMLInputElement;
    expect(input.value).toBe('Alice');
  });

  it('calls onChange with display_name when name input changes', () => {
    render(<OnboardingStepWelcome {...defaultProps} />);
    const input = screen.getByLabelText('What should we call you?');
    fireEvent.change(input, { target: { value: 'Bob' } });
    expect(mockOnChange).toHaveBeenCalledWith({ display_name: 'Bob' });
  });

  it('renders experience level label', () => {
    render(<OnboardingStepWelcome {...defaultProps} />);
    expect(screen.getByText('Experience Level')).toBeDefined();
  });

  it('renders name input placeholder', () => {
    render(<OnboardingStepWelcome {...defaultProps} />);
    expect(screen.getByPlaceholderText('Your name')).toBeDefined();
  });
});
