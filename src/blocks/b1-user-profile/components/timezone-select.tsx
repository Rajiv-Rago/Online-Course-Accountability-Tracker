'use client';

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

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function TimezoneSelect({ value, onChange }: Props) {
  const grouped = getTimezonesByRegion();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select timezone" />
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
  );
}
