import {
  subDays,
  subMonths,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  differenceInDays,
  parseISO,
  isValid,
} from 'date-fns';

export type RangePreset = '7d' | '30d' | '90d' | '1y' | 'all';

export interface DateRange {
  startDate: string; // ISO string
  endDate: string;   // ISO string
}

export function getDateRange(preset: RangePreset): DateRange {
  const now = new Date();
  const endDate = now.toISOString();

  switch (preset) {
    case '7d':
      return { startDate: subDays(now, 7).toISOString(), endDate };
    case '30d':
      return { startDate: subDays(now, 30).toISOString(), endDate };
    case '90d':
      return { startDate: subDays(now, 90).toISOString(), endDate };
    case '1y':
      return { startDate: subYears(now, 1).toISOString(), endDate };
    case 'all':
      return { startDate: new Date('2020-01-01').toISOString(), endDate };
  }
}

export function getWeekBoundaries(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function getMonthBoundaries(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function formatDateForPeriod(
  dateStr: string,
  period: 'day' | 'week' | 'month',
): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return dateStr;

  switch (period) {
    case 'day':
      return format(date, 'MMM d');
    case 'week':
      return `W${format(date, 'w')}`;
    case 'month':
      return format(date, 'MMM');
  }
}

export function formatDateShort(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return dateStr;
  return format(date, 'MMM d');
}

export function formatDateFull(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return dateStr;
  return format(date, 'MMMM d, yyyy');
}

export function generateDaysInYear(year: number): string[] {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
}

export function daysBetween(start: string, end: string): number {
  return differenceInDays(parseISO(end), parseISO(start));
}
