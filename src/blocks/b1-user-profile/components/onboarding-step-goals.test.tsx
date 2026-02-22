import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { OnboardingStepGoals } from './onboarding-step-goals';

describe('OnboardingStepGoals', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    data: { learning_goals: [] as string[] },
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading', () => {
    render(<OnboardingStepGoals {...defaultProps} />);
    expect(screen.getByText('What are your learning goals?')).toBeDefined();
  });

  it('renders all 7 predefined goal checkboxes', () => {
    render(<OnboardingStepGoals {...defaultProps} />);
    expect(screen.getByText('Career advancement')).toBeDefined();
    expect(screen.getByText('Learn a new programming language')).toBeDefined();
    expect(screen.getByText('Get certified')).toBeDefined();
    expect(screen.getByText('Build a side project')).toBeDefined();
    expect(screen.getByText('Switch careers')).toBeDefined();
    expect(screen.getByText('Stay current with technology')).toBeDefined();
    expect(screen.getByText('Personal interest')).toBeDefined();
  });

  it('calls onChange with added goal when a checkbox is toggled on', () => {
    render(<OnboardingStepGoals {...defaultProps} />);
    const checkbox = screen.getByText('Get certified');
    fireEvent.click(checkbox);
    expect(mockOnChange).toHaveBeenCalledWith({
      learning_goals: ['Get certified'],
    });
  });

  it('calls onChange with goal removed when a checkbox is toggled off', () => {
    const props = {
      data: { learning_goals: ['Get certified', 'Switch careers'] },
      onChange: mockOnChange,
    };
    render(<OnboardingStepGoals {...props} />);
    fireEvent.click(screen.getByText('Get certified'));
    expect(mockOnChange).toHaveBeenCalledWith({
      learning_goals: ['Switch careers'],
    });
  });

  it('adds a custom goal when Add button is clicked', () => {
    render(<OnboardingStepGoals {...defaultProps} />);
    const input = screen.getByPlaceholderText('Add your own goal');
    fireEvent.change(input, { target: { value: 'Learn Rust' } });
    fireEvent.click(screen.getByText('Add'));
    expect(mockOnChange).toHaveBeenCalledWith({
      learning_goals: ['Learn Rust'],
    });
  });

  it('adds a custom goal when Enter key is pressed', () => {
    render(<OnboardingStepGoals {...defaultProps} />);
    const input = screen.getByPlaceholderText('Add your own goal');
    fireEvent.change(input, { target: { value: 'Master TypeScript' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnChange).toHaveBeenCalledWith({
      learning_goals: ['Master TypeScript'],
    });
  });

  it('rejects empty custom goal', () => {
    render(<OnboardingStepGoals {...defaultProps} />);
    const input = screen.getByPlaceholderText('Add your own goal');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('Add'));
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only custom goal', () => {
    render(<OnboardingStepGoals {...defaultProps} />);
    const input = screen.getByPlaceholderText('Add your own goal');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Add'));
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('rejects duplicate custom goal', () => {
    const props = {
      data: { learning_goals: ['Learn Rust'] },
      onChange: mockOnChange,
    };
    render(<OnboardingStepGoals {...props} />);
    const input = screen.getByPlaceholderText('Add your own goal');
    fireEvent.change(input, { target: { value: 'Learn Rust' } });
    fireEvent.click(screen.getByText('Add'));
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('renders custom goals as removable badges', () => {
    const props = {
      data: { learning_goals: ['Career advancement', 'Learn Rust', 'Master Go'] },
      onChange: mockOnChange,
    };
    render(<OnboardingStepGoals {...props} />);
    // Custom goals (not predefined) should appear as badges
    expect(screen.getByText('Learn Rust')).toBeDefined();
    expect(screen.getByText('Master Go')).toBeDefined();
  });

  it('calls onChange to remove a custom goal when remove button is clicked', () => {
    const props = {
      data: { learning_goals: ['Learn Rust', 'Master Go'] },
      onChange: mockOnChange,
    };
    render(<OnboardingStepGoals {...props} />);
    // The remove buttons are inside Badge elements with className "gap-1"
    // They are the only non-"Add" buttons without text content
    const allButtons = screen.getAllByRole('button');
    // The "Add" button has text "Add", the remove buttons don't
    const removeButtons = allButtons.filter(
      (btn) => btn.textContent !== 'Add'
    );
    expect(removeButtons.length).toBe(2);
    fireEvent.click(removeButtons[0]);
    expect(mockOnChange).toHaveBeenCalledWith({
      learning_goals: ['Master Go'],
    });
  });
});
