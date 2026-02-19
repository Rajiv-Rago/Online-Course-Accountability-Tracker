'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OnboardingData } from '../lib/profile-validation';

interface Props {
  data: Partial<OnboardingData>;
  onChange: (data: Partial<OnboardingData>) => void;
}

export function OnboardingStepWelcome({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Welcome to Course Accountability Tracker!</h2>
        <p className="text-muted-foreground">
          Let&apos;s set up your profile so we can help you stay on track with your learning goals.
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="display_name">What should we call you?</Label>
          <Input
            id="display_name"
            value={data.display_name ?? ''}
            onChange={(e) => onChange({ display_name: e.target.value })}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience_level">Experience Level</Label>
          <Select
            value={data.experience_level ?? 'beginner'}
            onValueChange={(value) =>
              onChange({
                experience_level: value as 'beginner' | 'intermediate' | 'advanced',
              })
            }
          >
            <SelectTrigger id="experience_level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
