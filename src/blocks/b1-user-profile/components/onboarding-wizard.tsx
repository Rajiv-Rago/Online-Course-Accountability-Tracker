'use client';

import { useOnboarding } from '../hooks/use-onboarding';
import { OnboardingStepWelcome } from './onboarding-step-welcome';
import { OnboardingStepGoals } from './onboarding-step-goals';
import { OnboardingStepSchedule } from './onboarding-step-schedule';
import { OnboardingStepStyle } from './onboarding-step-style';
import { OnboardingStepComplete } from './onboarding-step-complete';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Welcome', 'Goals', 'Schedule', 'Style', 'Complete'];

interface OnboardingWizardProps {
  initialStep?: number;
  initialDisplayName?: string;
}

export function OnboardingWizard({
  initialStep = 1,
  initialDisplayName,
}: OnboardingWizardProps) {
  const {
    step,
    data,
    isFirstStep,
    isLastStep,
    goNext,
    goBack,
    setStepData,
    complete,
    isCompleting,
    error,
  } = useOnboarding(initialStep);

  // Pre-fill display name if available from auth metadata
  if (initialDisplayName && !data.display_name) {
    setStepData({ display_name: initialDisplayName });
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === step;
          const isComplete = stepNum < step;
          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                    isActive && 'border-primary bg-primary text-primary-foreground',
                    isComplete && 'border-primary bg-primary/10 text-primary',
                    !isActive && !isComplete && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isComplete ? '✓' : stepNum}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1',
                    isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-1 mt-[-14px]',
                    stepNum < step ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === 1 && <OnboardingStepWelcome data={data} onChange={setStepData} />}
        {step === 2 && <OnboardingStepGoals data={data} onChange={setStepData} />}
        {step === 3 && <OnboardingStepSchedule data={data} onChange={setStepData} />}
        {step === 4 && <OnboardingStepStyle data={data} onChange={setStepData} />}
        {step === 5 && <OnboardingStepComplete data={data} />}
      </div>

      {/* Error display */}
      {error && (
        <p className="text-sm text-destructive mt-2 text-center">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={isFirstStep || isCompleting}
        >
          Back
        </Button>

        {isLastStep ? (
          <Button onClick={complete} disabled={isCompleting}>
            {isCompleting ? 'Setting up...' : 'Start Learning'}
          </Button>
        ) : (
          <Button onClick={goNext}>Next</Button>
        )}
      </div>
    </div>
  );
}
