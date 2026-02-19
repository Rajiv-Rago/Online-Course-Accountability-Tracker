'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COURSE_PLATFORM } from '@/lib/types';
import type { CoursePlatform } from '@/lib/types';
import { PLATFORMS } from '../lib/platform-config';
import { PlatformIcon } from './platform-icon';

interface PlatformSelectProps {
  value: CoursePlatform | null;
  onChange: (platform: CoursePlatform | null) => void;
}

export function PlatformSelect({ value, onChange }: PlatformSelectProps) {
  return (
    <Select
      value={value || ''}
      onValueChange={(v) => onChange((v || null) as CoursePlatform | null)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a platform">
          {value && (
            <span className="flex items-center gap-2">
              <PlatformIcon platform={value} size={14} />
              {PLATFORMS[value]?.label ?? value}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.values(COURSE_PLATFORM) as CoursePlatform[]).map((p) => (
          <SelectItem key={p} value={p}>
            <span className="flex items-center gap-2">
              <PlatformIcon platform={p} size={14} />
              {PLATFORMS[p].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
