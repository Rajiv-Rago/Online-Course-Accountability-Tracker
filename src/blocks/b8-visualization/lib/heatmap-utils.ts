import { getDay, parseISO, format, startOfYear, endOfYear, eachDayOfInterval, differenceInCalendarWeeks } from 'date-fns';
import type { HeatmapDay } from '@/lib/types';

export interface HeatmapCell {
  date: string;       // YYYY-MM-DD
  dayOfWeek: number;  // 0=Mon...6=Sun
  weekIndex: number;  // 0-52
  minutes: number;
  sessionCount: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapGrid {
  cells: HeatmapCell[];
  totalWeeks: number;
}

// Thresholds for heatmap intensity levels
const INTENSITY_THRESHOLDS = [0, 1, 31, 61, 121]; // 0, 1-30, 31-60, 61-120, 121+

export function assignIntensityLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

function dayToMondayStart(date: Date): number {
  // getDay: 0=Sun, 1=Mon...6=Sat → convert to 0=Mon...6=Sun
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}

export function generateHeatmapGrid(
  year: number,
  data: HeatmapDay[],
): HeatmapGrid {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  const days = eachDayOfInterval({ start, end });

  const dataMap = new Map<string, HeatmapDay>();
  for (const d of data) {
    dataMap.set(d.date, d);
  }

  const firstDayWeekStart = dayToMondayStart(start);
  const totalWeeks = differenceInCalendarWeeks(end, start, { weekStartsOn: 1 }) + 1;

  const cells: HeatmapCell[] = days.map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = dayToMondayStart(date);
    const dayOfYear = Math.floor(
      (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const weekIndex = Math.floor((dayOfYear + firstDayWeekStart) / 7);

    const stat = dataMap.get(dateStr);
    const minutes = stat?.total_minutes ?? 0;
    const sessionCount = stat?.session_count ?? 0;

    return {
      date: dateStr,
      dayOfWeek,
      weekIndex,
      minutes,
      sessionCount,
      level: assignIntensityLevel(minutes),
    };
  });

  return { cells, totalWeeks };
}

export interface HeatmapSummary {
  totalHours: number;
  totalSessions: number;
  totalActiveDays: number;
  longestStreak: number;
  mostActiveDay: string;
  mostActiveMonth: string;
}

export function calculateHeatmapSummary(
  cells: HeatmapCell[],
): HeatmapSummary {
  let totalMinutes = 0;
  let totalSessions = 0;
  let totalActiveDays = 0;

  // Streak tracking
  let currentStreak = 0;
  let longestStreak = 0;

  // Day-of-week aggregation (0=Mon...6=Sun)
  const dayTotals = new Array(7).fill(0);
  const dayCounts = new Array(7).fill(0);

  // Month aggregation
  const monthTotals = new Map<string, number>();

  // Filter out future dates to avoid breaking streak with zero-minute future days
  const today = format(new Date(), 'yyyy-MM-dd');
  const sortedCells = [...cells]
    .filter((c) => c.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const cell of sortedCells) {
    totalMinutes += cell.minutes;
    totalSessions += cell.sessionCount;

    if (cell.minutes > 0) {
      totalActiveDays++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
      dayTotals[cell.dayOfWeek] += cell.minutes;
      dayCounts[cell.dayOfWeek]++;
    } else {
      currentStreak = 0;
    }

    const month = cell.date.substring(0, 7); // YYYY-MM
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + cell.minutes);
  }

  // Find most active day of week by average
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let bestDayIdx = 0;
  let bestDayAvg = 0;
  for (let i = 0; i < 7; i++) {
    const avg = dayCounts[i] > 0 ? dayTotals[i] / dayCounts[i] : 0;
    if (avg > bestDayAvg) {
      bestDayAvg = avg;
      bestDayIdx = i;
    }
  }

  // Find most active month
  let bestMonth = '';
  let bestMonthMinutes = 0;
  for (const [month, mins] of Array.from(monthTotals.entries())) {
    if (mins > bestMonthMinutes) {
      bestMonthMinutes = mins;
      bestMonth = month;
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const bestMonthName = bestMonth
    ? monthNames[parseInt(bestMonth.split('-')[1], 10) - 1]
    : 'N/A';

  return {
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    totalSessions,
    totalActiveDays,
    longestStreak,
    mostActiveDay: dayNames[bestDayIdx],
    mostActiveMonth: bestMonthName,
  };
}
