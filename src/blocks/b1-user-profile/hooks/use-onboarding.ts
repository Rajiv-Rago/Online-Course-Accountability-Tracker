'use client';

import { useReducer, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  type OnboardingData,
} from '../lib/profile-validation';
import {
  completeOnboarding,
  updateOnboardingStep,
} from '../actions/profile-actions';

interface OnboardingState {
  step: number;
  data: Partial<OnboardingData>;
  isCompleting: boolean;
  error: string | null;
}

type OnboardingAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_DATA'; data: Partial<OnboardingData> }
  | { type: 'SET_COMPLETING'; value: boolean }
  | { type: 'SET_ERROR'; error: string | null };

function reducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step, error: null };
    case 'SET_DATA':
      return { ...state, data: { ...state.data, ...action.data } };
    case 'SET_COMPLETING':
      return { ...state, isCompleting: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.error };
  }
}

const stepSchemas = [
  null, // step 0 placeholder
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  null, // step 5 = summary
];

export function useOnboarding(initialStep = 1) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    step: initialStep,
    data: {
      display_name: '',
      experience_level: 'beginner',
      learning_goals: [],
      preferred_days: [],
      preferred_time_start: '09:00',
      preferred_time_end: '17:00',
      daily_study_goal_mins: 60,
      weekly_study_goal_mins: 300,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      motivation_style: 'balanced',
    },
    isCompleting: false,
    error: null,
  });

  const setStepData = useCallback((data: Partial<OnboardingData>) => {
    dispatch({ type: 'SET_DATA', data });
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const schema = stepSchemas[state.step];
    if (!schema) return true;
    const result = schema.safeParse(state.data);
    if (!result.success) {
      dispatch({
        type: 'SET_ERROR',
        error: result.error.errors[0]?.message ?? 'Validation failed',
      });
      return false;
    }
    return true;
  }, [state.step, state.data]);

  const goNext = useCallback(async () => {
    if (!validateCurrentStep()) return;
    const nextStep = state.step + 1;
    dispatch({ type: 'SET_STEP', step: nextStep });
    try {
      await updateOnboardingStep(nextStep);
    } catch {
      // Non-critical: step persistence failure shouldn't block navigation
    }
  }, [state.step, validateCurrentStep]);

  const goBack = useCallback(async () => {
    const prevStep = state.step - 1;
    if (prevStep < 1) return;
    dispatch({ type: 'SET_STEP', step: prevStep });
    try {
      await updateOnboardingStep(prevStep);
    } catch {
      // Non-critical
    }
  }, [state.step]);

  const complete = useCallback(async () => {
    dispatch({ type: 'SET_COMPLETING', value: true });
    try {
      await completeOnboarding(state.data as OnboardingData);
      router.push('/dashboard');
    } catch (e) {
      dispatch({
        type: 'SET_ERROR',
        error: e instanceof Error ? e.message : 'Failed to complete onboarding',
      });
      dispatch({ type: 'SET_COMPLETING', value: false });
    }
  }, [state.data, router]);

  return {
    step: state.step,
    data: state.data,
    isFirstStep: state.step === 1,
    isLastStep: state.step === 5,
    goNext,
    goBack,
    setStepData,
    complete,
    isCompleting: state.isCompleting,
    error: state.error,
  };
}
