'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTimezonesByRegion, TIMEZONE_REGIONS } from '../lib/timezones';
import type { OnboardingData } from '../lib/profile-validation';
import type { DayOfWeek } from '@/lib/types/enums';

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

interface Props {
  data: Partial<OnboardingData>;
  onChange: (data: Partial<OnboardingData>) => void;
}

export function OnboardingStepSchedule({ data, onChange }: Props) {
  const preferredDays = (data.preferred_days ?? []) as DayOfWeek[];
  const grouped = getTimezonesByRegion();

  const toggleDay = (day: DayOfWeek) => {
    const updated = preferredDays.includes(day)
      ? preferredDays.filter((d) => d !== day)
      : [...preferredDays, day];
    onChange({ preferred_days: updated as OnboardingData['preferred_days'] });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">When do you prefer to study?</h2>
        <p className="text-muted-foreground">
          Set your preferred schedule so we can send reminders at the right time.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-5">
        {/* Day selection */}
        <div className="space-y-2">
          <Label>Preferred study days</Label>
          <div className="flex flex-wrap gap-3">
            {DAYS.map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-1.5">
                <Checkbox
                  id={`day-${value}`}
                  checked={preferredDays.includes(value)}
                  onCheckedChange={() => toggleDay(value)}
                />
                <Label htmlFor={`day-${value}`} className="cursor-pointer text-sm">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Time range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="time_start">Study window start</Label>
            <Input
              id="time_start"
              type="time"
              value={data.preferred_time_start ?? '09:00'}
              onChange={(e) => onChange({ preferred_time_start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time_end">Study window end</Label>
            <Input
              id="time_end"
              type="time"
              value={data.preferred_time_end ?? '17:00'}
              onChange={(e) => onChange({ preferred_time_end: e.target.value })}
            />
          </div>
        </div>

        {/* Study goals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="daily_goal">Daily study goal (min)</Label>
            <Input
              id="daily_goal"
              type="number"
              min={10}
              max={480}
              value={data.daily_study_goal_mins ?? 60}
              onChange={(e) =>
                onChange({ daily_study_goal_mins: parseInt(e.target.value) || 60 })
              }
            />
            <p className="text-xs text-muted-foreground">Recommended: 30-120 min</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weekly_goal">Weekly study goal (min)</Label>
            <Input
              id="weekly_goal"
              type="number"
              min={30}
              max={3360}
              value={data.weekly_study_goal_mins ?? 300}
              onChange={(e) =>
                onChange({ weekly_study_goal_mins: parseInt(e.target.value) || 300 })
              }
            />
            <p className="text-xs text-muted-foreground">
              {Math.round((data.weekly_study_goal_mins ?? 300) / 60)} hours/week
            </p>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={data.timezone ?? 'UTC'}
            onValueChange={(value) => onChange({ timezone: value })}
          >
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {TIMEZONE_REGIONS.map((region) => (
                <SelectGroup key={region}>
                  <SelectLabel>{region}</SelectLabel>
                  {grouped[region]?.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
