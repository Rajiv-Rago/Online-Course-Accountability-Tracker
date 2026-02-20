import {
  format,
  parseISO,
  startOfWeek,
  startOfMonth,
} from 'date-fns';
import type { StudySession, Course } from '@/lib/types';

export interface GroupedHoursPoint {
  period: string;
  periodStart: string;
  total: number;
  [courseId: string]: number | string;
}

export function groupSessionsByPeriod(
  sessions: StudySession[],
  period: 'day' | 'week' | 'month',
): GroupedHoursPoint[] {
  const map = new Map<string, GroupedHoursPoint>();

  for (const session of sessions) {
    const date = parseISO(session.started_at);
    let key: string;
    let label: string;

    switch (period) {
      case 'day':
        key = format(date, 'yyyy-MM-dd');
        label = format(date, 'MMM d');
        break;
      case 'week': {
        const ws = startOfWeek(date, { weekStartsOn: 1 });
        key = format(ws, 'yyyy-MM-dd');
        label = `W${format(ws, 'w')}`;
        break;
      }
      case 'month': {
        const ms = startOfMonth(date);
        key = format(ms, 'yyyy-MM');
        label = format(ms, 'MMM yyyy');
        break;
      }
    }

    if (!map.has(key)) {
      map.set(key, { period: label, periodStart: key, total: 0 });
    }
    const point = map.get(key)!;
    const hours = session.duration_minutes / 60;
    point.total += hours;
    const courseVal = (point[session.course_id] as number) || 0;
    point[session.course_id] = courseVal + hours;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.periodStart.localeCompare(b.periodStart),
  );
}

export interface DistributionBucket {
  bucket: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

const DURATION_BUCKETS = [
  { bucket: '0-15m', min: 0, max: 15 },
  { bucket: '16-30m', min: 16, max: 30 },
  { bucket: '31-45m', min: 31, max: 45 },
  { bucket: '46-60m', min: 46, max: 60 },
  { bucket: '61-90m', min: 61, max: 90 },
  { bucket: '91-120m', min: 91, max: 120 },
  { bucket: '120m+', min: 120, max: Infinity },
];

export function bucketSessionDurations(
  durations: number[],
): DistributionBucket[] {
  const total = durations.length;
  const counts = new Array(DURATION_BUCKETS.length).fill(0);

  for (const d of durations) {
    for (let i = 0; i < DURATION_BUCKETS.length; i++) {
      if (d >= DURATION_BUCKETS[i].min && d <= DURATION_BUCKETS[i].max) {
        counts[i]++;
        break;
      }
    }
  }

  return DURATION_BUCKETS.map((b, i) => ({
    ...b,
    count: counts[i],
    percentage: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
  }));
}

export function calculateProgress(course: Course): number {
  if (course.total_hours && course.total_hours > 0) {
    return Math.min(100, Math.round((course.completed_hours / course.total_hours) * 100));
  }
  if (course.total_modules && course.total_modules > 0) {
    return Math.min(100, Math.round((course.completed_modules / course.total_modules) * 100));
  }
  return 0;
}

export function calculateAverageDuration(durations: number[]): number {
  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

export function calculateMedianDuration(durations: number[]): number {
  if (durations.length === 0) return 0;
  const sorted = [...durations].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
