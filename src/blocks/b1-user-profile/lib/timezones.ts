export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
}

export const TIMEZONE_REGIONS = [
  'Americas',
  'Europe',
  'Asia',
  'Africa',
  'Pacific',
  'Australia',
] as const;

export const TIMEZONES: TimezoneOption[] = [
  // Americas
  { value: 'America/New_York', label: 'New York', offset: 'UTC-5', region: 'Americas' },
  { value: 'America/Chicago', label: 'Chicago', offset: 'UTC-6', region: 'Americas' },
  { value: 'America/Denver', label: 'Denver', offset: 'UTC-7', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', offset: 'UTC-8', region: 'Americas' },
  { value: 'America/Anchorage', label: 'Anchorage', offset: 'UTC-9', region: 'Americas' },
  { value: 'Pacific/Honolulu', label: 'Honolulu', offset: 'UTC-10', region: 'Americas' },
  { value: 'America/Toronto', label: 'Toronto', offset: 'UTC-5', region: 'Americas' },
  { value: 'America/Vancouver', label: 'Vancouver', offset: 'UTC-8', region: 'Americas' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: 'UTC-6', region: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo', offset: 'UTC-3', region: 'Americas' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires', offset: 'UTC-3', region: 'Americas' },
  { value: 'America/Bogota', label: 'Bogota', offset: 'UTC-5', region: 'Americas' },
  { value: 'America/Lima', label: 'Lima', offset: 'UTC-5', region: 'Americas' },
  { value: 'America/Santiago', label: 'Santiago', offset: 'UTC-4', region: 'Americas' },

  // Europe
  { value: 'Europe/London', label: 'London', offset: 'UTC+0', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Warsaw', label: 'Warsaw', offset: 'UTC+1', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens', offset: 'UTC+2', region: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Helsinki', offset: 'UTC+2', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul', offset: 'UTC+3', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: 'UTC+3', region: 'Europe' },
  { value: 'Europe/Lisbon', label: 'Lisbon', offset: 'UTC+0', region: 'Europe' },

  // Asia
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+4', region: 'Asia' },
  { value: 'Asia/Karachi', label: 'Karachi', offset: 'UTC+5', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Kolkata', offset: 'UTC+5:30', region: 'Asia' },
  { value: 'Asia/Dhaka', label: 'Dhaka', offset: 'UTC+6', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: 'UTC+7', region: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Jakarta', offset: 'UTC+7', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: 'UTC+8', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: 'UTC+8', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai', offset: 'UTC+8', region: 'Asia' },
  { value: 'Asia/Taipei', label: 'Taipei', offset: 'UTC+8', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: 'UTC+9', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'UTC+9', region: 'Asia' },

  // Africa
  { value: 'Africa/Cairo', label: 'Cairo', offset: 'UTC+2', region: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos', offset: 'UTC+1', region: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: 'UTC+2', region: 'Africa' },
  { value: 'Africa/Nairobi', label: 'Nairobi', offset: 'UTC+3', region: 'Africa' },
  { value: 'Africa/Casablanca', label: 'Casablanca', offset: 'UTC+1', region: 'Africa' },

  // Pacific
  { value: 'Pacific/Auckland', label: 'Auckland', offset: 'UTC+12', region: 'Pacific' },
  { value: 'Pacific/Fiji', label: 'Fiji', offset: 'UTC+12', region: 'Pacific' },

  // Australia
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'UTC+11', region: 'Australia' },
  { value: 'Australia/Melbourne', label: 'Melbourne', offset: 'UTC+11', region: 'Australia' },
  { value: 'Australia/Brisbane', label: 'Brisbane', offset: 'UTC+10', region: 'Australia' },
  { value: 'Australia/Perth', label: 'Perth', offset: 'UTC+8', region: 'Australia' },
  { value: 'Australia/Adelaide', label: 'Adelaide', offset: 'UTC+10:30', region: 'Australia' },
];

export function getTimezonesByRegion() {
  const grouped: Record<string, TimezoneOption[]> = {};
  for (const tz of TIMEZONES) {
    if (!grouped[tz.region]) grouped[tz.region] = [];
    grouped[tz.region].push(tz);
  }
  return grouped;
}

export function getTimezoneLabel(value: string): string {
  const tz = TIMEZONES.find((t) => t.value === value);
  if (tz) return `${tz.label} (${tz.offset})`;
  return value;
}
