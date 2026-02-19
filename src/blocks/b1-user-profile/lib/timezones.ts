export interface TimezoneOption {
  value: string;
  label: string;
  region: string;
}

export const TIMEZONE_REGIONS = [
  'Americas',
  'Europe',
  'Asia',
  'Africa',
  'Pacific',
  'Australia',
  'Other',
] as const;

export const TIMEZONES: TimezoneOption[] = [
  // Other (UTC)
  { value: 'UTC', label: 'UTC', region: 'Other' },

  // Americas
  { value: 'America/New_York', label: 'New York', region: 'Americas' },
  { value: 'America/Chicago', label: 'Chicago', region: 'Americas' },
  { value: 'America/Denver', label: 'Denver', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', region: 'Americas' },
  { value: 'America/Anchorage', label: 'Anchorage', region: 'Americas' },
  { value: 'Pacific/Honolulu', label: 'Honolulu', region: 'Americas' },
  { value: 'America/Toronto', label: 'Toronto', region: 'Americas' },
  { value: 'America/Vancouver', label: 'Vancouver', region: 'Americas' },
  { value: 'America/Mexico_City', label: 'Mexico City', region: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo', region: 'Americas' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires', region: 'Americas' },
  { value: 'America/Bogota', label: 'Bogota', region: 'Americas' },
  { value: 'America/Lima', label: 'Lima', region: 'Americas' },
  { value: 'America/Santiago', label: 'Santiago', region: 'Americas' },

  // Europe
  { value: 'Europe/London', label: 'London', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm', region: 'Europe' },
  { value: 'Europe/Warsaw', label: 'Warsaw', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens', region: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Helsinki', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow', region: 'Europe' },
  { value: 'Europe/Lisbon', label: 'Lisbon', region: 'Europe' },

  // Asia
  { value: 'Asia/Dubai', label: 'Dubai', region: 'Asia' },
  { value: 'Asia/Karachi', label: 'Karachi', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Kolkata', region: 'Asia' },
  { value: 'Asia/Dhaka', label: 'Dhaka', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok', region: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Jakarta', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai', region: 'Asia' },
  { value: 'Asia/Taipei', label: 'Taipei', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo', region: 'Asia' },
  { value: 'Asia/Almaty', label: 'Almaty', region: 'Asia' },
  { value: 'Asia/Tashkent', label: 'Tashkent', region: 'Asia' },
  { value: 'Asia/Tehran', label: 'Tehran', region: 'Asia' },
  { value: 'Asia/Riyadh', label: 'Riyadh', region: 'Asia' },

  // Africa
  { value: 'Africa/Cairo', label: 'Cairo', region: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos', region: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', region: 'Africa' },
  { value: 'Africa/Nairobi', label: 'Nairobi', region: 'Africa' },
  { value: 'Africa/Casablanca', label: 'Casablanca', region: 'Africa' },

  // Pacific
  { value: 'Pacific/Auckland', label: 'Auckland', region: 'Pacific' },
  { value: 'Pacific/Fiji', label: 'Fiji', region: 'Pacific' },

  // Australia
  { value: 'Australia/Sydney', label: 'Sydney', region: 'Australia' },
  { value: 'Australia/Melbourne', label: 'Melbourne', region: 'Australia' },
  { value: 'Australia/Brisbane', label: 'Brisbane', region: 'Australia' },
  { value: 'Australia/Perth', label: 'Perth', region: 'Australia' },
  { value: 'Australia/Adelaide', label: 'Adelaide', region: 'Australia' },
];

/** Compute the current UTC offset for a timezone dynamically (DST-aware) */
function getCurrentOffset(tzValue: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzValue,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value ?? '';
  } catch {
    return '';
  }
}

export function getTimezonesByRegion() {
  const grouped: Record<string, (TimezoneOption & { offset: string })[]> = {};
  for (const tz of TIMEZONES) {
    if (!grouped[tz.region]) grouped[tz.region] = [];
    grouped[tz.region].push({ ...tz, offset: getCurrentOffset(tz.value) });
  }
  return grouped;
}

export function getTimezoneLabel(value: string): string {
  const tz = TIMEZONES.find((t) => t.value === value);
  if (!tz) return value;
  const offset = getCurrentOffset(value);
  return offset ? `${tz.label} (${offset})` : tz.label;
}
