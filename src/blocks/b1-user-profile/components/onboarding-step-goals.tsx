'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { OnboardingData } from '../lib/profile-validation';

const PREDEFINED_GOALS = [
  'Career advancement',
  'Learn a new programming language',
  'Get certified',
  'Build a side project',
  'Switch careers',
  'Stay current with technology',
  'Personal interest',
];

interface Props {
  data: Partial<OnboardingData>;
  onChange: (data: Partial<OnboardingData>) => void;
}

export function OnboardingStepGoals({ data, onChange }: Props) {
  const [customGoal, setCustomGoal] = useState('');
  const goals = data.learning_goals ?? [];

  const toggleGoal = (goal: string) => {
    const updated = goals.includes(goal)
      ? goals.filter((g) => g !== goal)
      : [...goals, goal];
    onChange({ learning_goals: updated });
  };

  const addCustomGoal = () => {
    const trimmed = customGoal.trim();
    if (!trimmed || goals.includes(trimmed)) return;
    onChange({ learning_goals: [...goals, trimmed] });
    setCustomGoal('');
  };

  const removeGoal = (goal: string) => {
    onChange({ learning_goals: goals.filter((g) => g !== goal) });
  };

  const customGoals = goals.filter((g) => !PREDEFINED_GOALS.includes(g));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">What are your learning goals?</h2>
        <p className="text-muted-foreground">Select all that apply, or add your own.</p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        {PREDEFINED_GOALS.map((goal) => (
          <div key={goal} className="flex items-center space-x-2">
            <Checkbox
              id={goal}
              checked={goals.includes(goal)}
              onCheckedChange={() => toggleGoal(goal)}
            />
            <Label htmlFor={goal} className="cursor-pointer">
              {goal}
            </Label>
          </div>
        ))}
      </div>

      <div className="max-w-sm mx-auto space-y-3">
        <Label>Custom goal</Label>
        <div className="flex gap-2">
          <Input
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            placeholder="Add your own goal"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomGoal();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addCustomGoal}>
            Add
          </Button>
        </div>

        {customGoals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customGoals.map((goal) => (
              <Badge key={goal} variant="secondary" className="gap-1">
                {goal}
                <button onClick={() => removeGoal(goal)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
