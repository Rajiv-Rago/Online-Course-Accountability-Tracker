'use client';

import { Card, CardContent } from '@/components/ui/card';
import { getTimezoneLabel } from '../lib/timezones';
import { getMotivationStyleInfo } from '../lib/motivation-styles';
import type { OnboardingData } from '../lib/profile-validation';
import type { MotivationStyle } from '@/lib/types/enums';

interface Props {
  data: Partial<OnboardingData>;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export function OnboardingStepComplete({ data }: Props) {
  const styleInfo = getMotivationStyleInfo(
    (data.motivation_style ?? 'balanced') as MotivationStyle
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          You&apos;re all set{data.display_name ? `, ${data.display_name}` : ''}!
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s a summary of your preferences.
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 space-y-3">
          <SummaryRow label="Name" value={data.display_name || '—'} />
          <SummaryRow
            label="Level"
            value={capitalize(data.experience_level ?? 'beginner')}
          />
          <SummaryRow
            label="Goals"
            value={data.learning_goals?.join(', ') || '—'}
          />
          <SummaryRow
            label="Days"
            value={
              data.preferred_days?.map((d) => DAY_LABELS[d] ?? d).join(', ') || '—'
            }
          />
          <SummaryRow
            label="Window"
            value={`${data.preferred_time_start ?? '09:00'} – ${data.preferred_time_end ?? '17:00'}`}
          />
          <SummaryRow
            label="Daily Goal"
            value={`${data.daily_study_goal_mins ?? 60} min`}
          />
          <SummaryRow
            label="Weekly Goal"
            value={`${data.weekly_study_goal_mins ?? 300} min (${Math.round((data.weekly_study_goal_mins ?? 300) / 60)}h)`}
          />
          <SummaryRow label="Style" value={styleInfo.label} />
          <SummaryRow
            label="Timezone"
            value={getTimezoneLabel(data.timezone ?? 'UTC')}
          />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        You can change these anytime in Settings.
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground text-sm shrink-0">{label}:</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
