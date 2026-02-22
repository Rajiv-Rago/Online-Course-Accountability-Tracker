import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock hooks BEFORE importing component
const mockGoNext = vi.fn();
const mockGoBack = vi.fn();
const mockSetStepData = vi.fn();
const mockComplete = vi.fn();

vi.mock('../hooks/use-onboarding', () => ({
  useOnboarding: vi.fn(() => ({
    step: 1,
    data: { display_name: 'Alice' },
    isFirstStep: true,
    isLastStep: false,
    goNext: mockGoNext,
    goBack: mockGoBack,
    setStepData: mockSetStepData,
    complete: mockComplete,
    isCompleting: false,
    error: null,
  })),
}));

// Mock child step components
vi.mock('./onboarding-step-welcome', () => ({
  OnboardingStepWelcome: ({ data, onChange }: any) => (
    <div data-testid="step-welcome">Welcome Step - {data.display_name}</div>
  ),
}));

vi.mock('./onboarding-step-goals', () => ({
  OnboardingStepGoals: () => <div data-testid="step-goals">Goals Step</div>,
}));

vi.mock('./onboarding-step-schedule', () => ({
  OnboardingStepSchedule: () => <div data-testid="step-schedule">Schedule Step</div>,
}));

vi.mock('./onboarding-step-style', () => ({
  OnboardingStepStyle: () => <div data-testid="step-style">Style Step</div>,
}));

vi.mock('./onboarding-step-complete', () => ({
  OnboardingStepComplete: () => <div data-testid="step-complete">Complete Step</div>,
}));

import { OnboardingWizard } from './onboarding-wizard';
import { useOnboarding } from '../hooks/use-onboarding';

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOnboarding).mockReturnValue({
      step: 1,
      data: { display_name: 'Alice' },
      isFirstStep: true,
      isLastStep: false,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: false,
      error: null,
    });
  });

  it('renders step 1 (Welcome) by default', () => {
    render(<OnboardingWizard />);
    expect(screen.getByTestId('step-welcome')).toBeDefined();
    expect(screen.queryByTestId('step-goals')).toBeNull();
  });

  it('renders step 2 (Goals) when step is 2', () => {
    vi.mocked(useOnboarding).mockReturnValue({
      step: 2,
      data: {},
      isFirstStep: false,
      isLastStep: false,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: false,
      error: null,
    });
    render(<OnboardingWizard />);
    expect(screen.getByTestId('step-goals')).toBeDefined();
    expect(screen.queryByTestId('step-welcome')).toBeNull();
  });

  it('renders step 3 (Schedule) when step is 3', () => {
    vi.mocked(useOnboarding).mockReturnValue({
      step: 3,
      data: {},
      isFirstStep: false,
      isLastStep: false,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: false,
      error: null,
    });
    render(<OnboardingWizard />);
    expect(screen.getByTestId('step-schedule')).toBeDefined();
  });

  it('renders step 4 (Style) when step is 4', () => {
    vi.mocked(useOnboarding).mockReturnValue({
      step: 4,
      data: {},
      isFirstStep: false,
      isLastStep: false,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: false,
      error: null,
    });
    render(<OnboardingWizard />);
    expect(screen.getByTestId('step-style')).toBeDefined();
  });

  it('renders step 5 (Complete) when step is 5', () => {
    vi.mocked(useOnboarding).mockReturnValue({
      step: 5,
      data: {},
      isFirstStep: false,
      isLastStep: true,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: false,
      error: null,
    });
    render(<OnboardingWizard />);
    expect(screen.getByTestId('step-complete')).toBeDefined();
  });

  it('renders all 5 step labels in the progress indicator', () => {
    render(<OnboardingWizard />);
    expect(screen.getByText('Welcome')).toBeDefined();
    expect(screen.getByText('Goals')).toBeDefined();
    expect(screen.getByText('Schedule')).toBeDefined();
    expect(screen.getByText('Style')).toBeDefined();
    expect(screen.getByText('Complete')).toBeDefined();
  });

  it('disables Back button on step 1 (first step)', () => {
    render(<OnboardingWizard />);
    const backBtn = screen.getByText('Back').closest('button') as HTMLButtonElement;
    expect(backBtn.disabled).toBe(true);
  });

  it('shows Next button on non-last steps', () => {
    render(<OnboardingWizard />);
    expect(screen.getByText('Next')).toBeDefined();
    expect(screen.queryByText('Start Learning')).toBeNull();
  });

  it('shows "Start Learning" button on last step', () => {
    vi.mocked(useOnboarding).mockReturnValue({
      step: 5,
      data: {},
      isFirstStep: false,
      isLastStep: true,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: false,
      error: null,
    });
    render(<OnboardingWizard />);
    expect(screen.getByText('Start Learning')).toBeDefined();
    expect(screen.queryByText('Next')).toBeNull();
  });

  it('shows "Setting up..." text when completing', () => {
    vi.mocked(useOnboarding).mockReturnValue({
      step: 5,
      data: {},
      isFirstStep: false,
      isLastStep: true,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: true,
      error: null,
    });
    render(<OnboardingWizard />);
    expect(screen.getByText('Setting up...')).toBeDefined();
  });

  it('displays error message when error exists', () => {
    vi.mocked(useOnboarding).mockReturnValue({
      step: 2,
      data: {},
      isFirstStep: false,
      isLastStep: false,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: false,
      error: 'Please select at least one goal',
    });
    render(<OnboardingWizard />);
    expect(screen.getByText('Please select at least one goal')).toBeDefined();
  });

  it('calls goNext when Next is clicked', () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByText('Next'));
    expect(mockGoNext).toHaveBeenCalledOnce();
  });

  it('calls complete when Start Learning is clicked on last step', () => {
    vi.mocked(useOnboarding).mockReturnValue({
      step: 5,
      data: {},
      isFirstStep: false,
      isLastStep: true,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: false,
      error: null,
    });
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByText('Start Learning'));
    expect(mockComplete).toHaveBeenCalledOnce();
  });

  it('calls goBack when Back is clicked on non-first step', () => {
    vi.mocked(useOnboarding).mockReturnValue({
      step: 3,
      data: {},
      isFirstStep: false,
      isLastStep: false,
      goNext: mockGoNext,
      goBack: mockGoBack,
      setStepData: mockSetStepData,
      complete: mockComplete,
      isCompleting: false,
      error: null,
    });
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByText('Back'));
    expect(mockGoBack).toHaveBeenCalledOnce();
  });
});
