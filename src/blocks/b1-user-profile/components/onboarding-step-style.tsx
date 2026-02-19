'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Scale, Flame } from 'lucide-react';
import { MOTIVATION_STYLES } from '../lib/motivation-styles';
import { cn } from '@/lib/utils';
import type { OnboardingData } from '../lib/profile-validation';
import type { MotivationStyle } from '@/lib/types/enums';

const ICONS = {
  heart: Heart,
  scale: Scale,
  flame: Flame,
} as const;

interface Props {
  data: Partial<OnboardingData>;
  onChange: (data: Partial<OnboardingData>) => void;
}

export function OnboardingStepStyle({ data, onChange }: Props) {
  const selected = data.motivation_style ?? 'balanced';

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">How would you like to be motivated?</h2>
        <p className="text-muted-foreground">
          This controls the tone of AI-generated messages and reminders.
        </p>
      </div>

      <RadioGroup
        value={selected}
        onValueChange={(value) =>
          onChange({ motivation_style: value as MotivationStyle })
        }
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
      >
        {MOTIVATION_STYLES.map((style) => {
          const Icon = ICONS[style.icon];
          const isSelected = selected === style.value;

          return (
            <Label
              key={style.value}
              htmlFor={style.value}
              className="cursor-pointer"
            >
              <Card
                className={cn(
                  'transition-colors hover:border-primary/50',
                  isSelected && 'border-primary bg-primary/5'
                )}
              >
                <CardContent className="pt-6 space-y-3 text-center">
                  <div className="flex justify-center">
                    <Icon
                      className={cn(
                        'h-8 w-8',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold">{style.label}</span>
                    {style.recommended && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {style.description}
                  </p>
                  <p className="text-sm italic text-muted-foreground/80">
                    &quot;{style.exampleQuote}&quot;
                  </p>
                  <RadioGroupItem
                    value={style.value}
                    id={style.value}
                    className="mx-auto"
                  />
                </CardContent>
              </Card>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
