import {
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  parseISO,
  isYesterday,
  format,
} from 'date-fns';

export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = parseISO(timestamp);
  const mins = differenceInMinutes(now, date);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h ago`;

  if (isYesterday(date)) return 'yesterday';

  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d ago`;

  return format(date, 'MMM d');
}

export function formatDays(days: string[]): string {
  const dayNames: Record<string, string> = {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  };
  return days.map((d) => dayNames[d] ?? d).join(', ');
}

export function formatTime24to12(time: string): string {
  // time is "HH:MM" or "HH:MM:SS"
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}
