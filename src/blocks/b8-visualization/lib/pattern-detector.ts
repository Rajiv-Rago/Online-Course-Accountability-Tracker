import { parseISO, getDay, getHours, differenceInDays } from 'date-fns';
import type { StudySession } from '@/lib/types';

export interface PatternInsight {
  id: string;
  title: string;
  description: string;
  confidence: number;
  supportingData: {
    labels: string[];
    values: number[];
    chartType: 'bar' | 'line';
  };
  category: 'timing' | 'duration' | 'consistency' | 'productivity';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function detectBestStudyDay(sessions: StudySession[]): PatternInsight | null {
  const dayMinutes = new Array(7).fill(0);
  const dayCounts = new Array(7).fill(0);

  for (const s of sessions) {
    const dow = getDay(parseISO(s.started_at));
    dayMinutes[dow] += s.duration_minutes;
    dayCounts[dow]++;
  }

  const dayAvgs = dayMinutes.map((m, i) => (dayCounts[i] > 0 ? m / dayCounts[i] : 0));
  const maxAvg = Math.max(...dayAvgs);
  const overallAvg = dayAvgs.reduce((a, b) => a + b, 0) / 7;
  if (maxAvg === 0 || overallAvg === 0) return null;

  const bestDay = dayAvgs.indexOf(maxAvg);
  const ratio = maxAvg / overallAvg;
  const confidence = Math.min(0.95, 0.5 + (ratio - 1) * 0.3);
  if (confidence < 0.7) return null;

  return {
    id: 'best-study-day',
    title: `You study best on ${DAY_NAMES[bestDay]}s`,
    description: `Your ${DAY_NAMES[bestDay]} sessions average ${Math.round(maxAvg)} min vs ${Math.round(overallAvg)} min overall.`,
    confidence: Math.round(confidence * 100) / 100,
    supportingData: {
      labels: DAY_SHORT,
      values: dayAvgs.map(Math.round),
      chartType: 'bar',
    },
    category: 'timing',
  };
}

function detectBestStudyTime(sessions: StudySession[]): PatternInsight | null {
  // Bucket into 2-hour windows
  const bucketLabels = ['6-8AM', '8-10AM', '10-12PM', '12-2PM', '2-4PM', '4-6PM', '6-8PM', '8-10PM', '10-12AM'];
  const bucketMinutes = new Array(9).fill(0);
  const bucketCounts = new Array(9).fill(0);

  for (const s of sessions) {
    const hour = getHours(parseISO(s.started_at));
    const idx = Math.max(0, Math.min(8, Math.floor((hour - 6) / 2)));
    bucketMinutes[idx] += s.duration_minutes;
    bucketCounts[idx]++;
  }

  const bucketAvgs = bucketMinutes.map((m, i) => (bucketCounts[i] > 0 ? m / bucketCounts[i] : 0));
  const maxAvg = Math.max(...bucketAvgs);
  const totalSessions = bucketCounts.reduce((a, b) => a + b, 0);
  if (maxAvg === 0 || totalSessions === 0) return null;

  const bestBucket = bucketAvgs.indexOf(maxAvg);
  const peakShare = bucketCounts[bestBucket] / totalSessions;
  const confidence = Math.min(0.95, 0.5 + peakShare * 1.5);
  if (confidence < 0.7) return null;

  return {
    id: 'best-study-time',
    title: `Your peak study time is ${bucketLabels[bestBucket]}`,
    description: `${Math.round(peakShare * 100)}% of your sessions happen during this window with an average of ${Math.round(maxAvg)} min.`,
    confidence: Math.round(confidence * 100) / 100,
    supportingData: {
      labels: bucketLabels,
      values: bucketAvgs.map(Math.round),
      chartType: 'bar',
    },
    category: 'timing',
  };
}

function detectOptimalSessionLength(sessions: StudySession[]): PatternInsight | null {
  // Sort sessions by date, check if studying next day correlates with session length
  const bucketLabels = ['<15m', '15-30m', '30-45m', '45-60m', '60-90m', '>90m'];
  const bucketBounds = [[0, 15], [15, 30], [30, 45], [45, 60], [60, 90], [90, Infinity]];

  // Group sessions by date
  const sessionsByDate = new Map<string, StudySession[]>();
  for (const s of sessions) {
    const d = s.started_at.split('T')[0];
    if (!sessionsByDate.has(d)) sessionsByDate.set(d, []);
    sessionsByDate.get(d)!.push(s);
  }

  const dates = Array.from(sessionsByDate.keys()).sort();
  const bucketNextDay = new Array(6).fill(0); // count of "studied next day"
  const bucketTotal = new Array(6).fill(0);

  for (let i = 0; i < dates.length - 1; i++) {
    const todaySessions = sessionsByDate.get(dates[i])!;
    const avgDuration = todaySessions.reduce((s, sess) => s + sess.duration_minutes, 0) / todaySessions.length;
    const nextDay = dates[i + 1];
    const diff = differenceInDays(parseISO(nextDay), parseISO(dates[i]));
    const studiedNextDay = diff === 1;

    for (let b = 0; b < bucketBounds.length; b++) {
      if (avgDuration >= bucketBounds[b][0] && avgDuration < bucketBounds[b][1]) {
        bucketTotal[b]++;
        if (studiedNextDay) bucketNextDay[b]++;
        break;
      }
    }
  }

  const rates = bucketTotal.map((t, i) => (t > 2 ? bucketNextDay[i] / t : 0));
  const maxRate = Math.max(...rates);
  if (maxRate === 0) return null;

  const bestBucket = rates.indexOf(maxRate);
  const confidence = Math.min(0.95, 0.5 + (maxRate - 0.5) * 0.8);
  if (confidence < 0.7) return null;

  return {
    id: 'optimal-session-length',
    title: `Your optimal session length is ${bucketLabels[bestBucket]}`,
    description: `After ${bucketLabels[bestBucket]} sessions, you're ${Math.round(maxRate * 100)}% likely to study the next day.`,
    confidence: Math.round(confidence * 100) / 100,
    supportingData: {
      labels: bucketLabels,
      values: rates.map((r) => Math.round(r * 100)),
      chartType: 'bar',
    },
    category: 'duration',
  };
}

function detectMorningVsEvening(sessions: StudySession[]): PatternInsight | null {
  let morningMinutes = 0;
  let morningCount = 0;
  let eveningMinutes = 0;
  let eveningCount = 0;

  for (const s of sessions) {
    const hour = getHours(parseISO(s.started_at));
    if (hour < 12) {
      morningMinutes += s.duration_minutes;
      morningCount++;
    } else {
      eveningMinutes += s.duration_minutes;
      eveningCount++;
    }
  }

  if (morningCount < 3 || eveningCount < 3) return null;

  const morningAvg = morningMinutes / morningCount;
  const eveningAvg = eveningMinutes / eveningCount;
  const diff = Math.abs(morningAvg - eveningAvg);
  const max = Math.max(morningAvg, eveningAvg);
  const percentDiff = max > 0 ? Math.round((diff / Math.min(morningAvg, eveningAvg)) * 100) : 0;

  const confidence = Math.min(0.95, 0.5 + (percentDiff / 100) * 0.5);
  if (confidence < 0.7) return null;

  const better = morningAvg > eveningAvg ? 'morning' : 'evening';

  return {
    id: 'morning-vs-evening',
    title: `You're ${percentDiff}% more productive in ${better} sessions`,
    description: `Average ${better} session: ${Math.round(better === 'morning' ? morningAvg : eveningAvg)} min vs ${Math.round(better === 'morning' ? eveningAvg : morningAvg)} min.`,
    confidence: Math.round(confidence * 100) / 100,
    supportingData: {
      labels: ['Morning', 'Evening'],
      values: [Math.round(morningAvg), Math.round(eveningAvg)],
      chartType: 'bar',
    },
    category: 'productivity',
  };
}

function detectStreakMomentum(sessions: StudySession[]): PatternInsight | null {
  const sessionsByDate = new Map<string, boolean>();
  for (const s of sessions) {
    sessionsByDate.set(s.started_at.split('T')[0], true);
  }

  const dates = Array.from(sessionsByDate.keys()).sort();
  if (dates.length < 10) return null;

  // Calculate streak lengths and subsequent consistency
  const streakConsistency = new Map<number, { total: number; continued: number }>();

  let currentStreak = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0 || differenceInDays(parseISO(dates[i]), parseISO(dates[i - 1])) === 1) {
      currentStreak++;
    } else {
      // Streak just broke - record the streak length and whether they came back within 2 days
      if (currentStreak >= 1) {
        const bucket = Math.min(currentStreak, 7);
        if (!streakConsistency.has(bucket)) {
          streakConsistency.set(bucket, { total: 0, continued: 0 });
        }
        const entry = streakConsistency.get(bucket)!;
        entry.total++;
        const gap = differenceInDays(parseISO(dates[i]), parseISO(dates[i - 1]));
        if (gap <= 2) entry.continued++;
      }
      currentStreak = 1;
    }
  }

  const labels: string[] = [];
  const values: number[] = [];
  let bestStreak = 0;
  let bestRate = 0;

  for (let s = 1; s <= 7; s++) {
    const entry = streakConsistency.get(s);
    labels.push(`${s}d`);
    if (entry && entry.total >= 2) {
      const rate = entry.continued / entry.total;
      values.push(Math.round(rate * 100));
      if (rate > bestRate) {
        bestRate = rate;
        bestStreak = s;
      }
    } else {
      values.push(0);
    }
  }

  const confidence = Math.min(0.95, 0.5 + (bestRate - 0.5) * 0.6);
  if (confidence < 0.7 || bestStreak === 0) return null;

  return {
    id: 'streak-momentum',
    title: `Your consistency improves after ${bestStreak}-day streaks`,
    description: `After ${bestStreak}+ day streaks, you're ${Math.round(bestRate * 100)}% likely to continue studying.`,
    confidence: Math.round(confidence * 100) / 100,
    supportingData: { labels, values, chartType: 'line' },
    category: 'consistency',
  };
}

function detectWeekendVsWeekday(sessions: StudySession[]): PatternInsight | null {
  let weekdayMinutes = 0;
  let weekdayDays = 0;
  let weekendMinutes = 0;
  let weekendDays = 0;

  const dateMap = new Map<string, number>();
  for (const s of sessions) {
    const d = s.started_at.split('T')[0];
    dateMap.set(d, (dateMap.get(d) ?? 0) + s.duration_minutes);
  }

  for (const [dateStr, minutes] of Array.from(dateMap.entries())) {
    const dow = getDay(parseISO(dateStr));
    if (dow === 0 || dow === 6) {
      weekendMinutes += minutes;
      weekendDays++;
    } else {
      weekdayMinutes += minutes;
      weekdayDays++;
    }
  }

  if (weekdayDays < 3 || weekendDays < 2) return null;

  const weekdayAvg = weekdayMinutes / weekdayDays;
  const weekendAvg = weekendMinutes / weekendDays;
  const diff = Math.abs(weekdayAvg - weekendAvg);
  const min = Math.min(weekdayAvg, weekendAvg);
  if (min === 0) return null;
  const percentDiff = Math.round((diff / min) * 100);

  const confidence = Math.min(0.95, 0.5 + (percentDiff / 100) * 0.3);
  if (confidence < 0.7) return null;

  const more = weekdayAvg > weekendAvg ? 'weekdays' : 'weekends';

  return {
    id: 'weekend-vs-weekday',
    title: `You study ${percentDiff}% more on ${more}`,
    description: `Average: ${Math.round(weekdayAvg)} min/weekday vs ${Math.round(weekendAvg)} min/weekend day.`,
    confidence: Math.round(confidence * 100) / 100,
    supportingData: {
      labels: ['Weekday', 'Weekend'],
      values: [Math.round(weekdayAvg), Math.round(weekendAvg)],
      chartType: 'bar',
    },
    category: 'productivity',
  };
}

function detectCourseSwitchingCost(sessions: StudySession[]): PatternInsight | null {
  // Group sessions by date
  const sessionsByDate = new Map<string, StudySession[]>();
  for (const s of sessions) {
    const d = s.started_at.split('T')[0];
    if (!sessionsByDate.has(d)) sessionsByDate.set(d, []);
    sessionsByDate.get(d)!.push(s);
  }

  let singleCourseMinutes = 0;
  let singleCourseDays = 0;
  let multiCourseMinutes = 0;
  let multiCourseDays = 0;

  for (const [, daySessions] of Array.from(sessionsByDate.entries())) {
    const uniqueCourses = new Set(daySessions.map((s) => s.course_id));
    const totalMins = daySessions.reduce((s, sess) => s + sess.duration_minutes, 0);
    const avgPerSession = totalMins / daySessions.length;

    if (uniqueCourses.size === 1) {
      singleCourseMinutes += avgPerSession;
      singleCourseDays++;
    } else {
      multiCourseMinutes += avgPerSession;
      multiCourseDays++;
    }
  }

  if (singleCourseDays < 3 || multiCourseDays < 3) return null;

  const singleAvg = singleCourseMinutes / singleCourseDays;
  const multiAvg = multiCourseMinutes / multiCourseDays;
  if (multiAvg === 0) return null;

  const percentDiff = Math.round(((singleAvg - multiAvg) / multiAvg) * 100);
  if (percentDiff <= 0) return null;

  const confidence = Math.min(0.95, 0.5 + (percentDiff / 100) * 0.5);
  if (confidence < 0.7) return null;

  return {
    id: 'course-switching-cost',
    title: `Staying on one course per day boosts focus by ${percentDiff}%`,
    description: `Single-course days avg ${Math.round(singleAvg)} min/session vs ${Math.round(multiAvg)} min when switching.`,
    confidence: Math.round(confidence * 100) / 100,
    supportingData: {
      labels: ['Single Course', 'Multi Course'],
      values: [Math.round(singleAvg), Math.round(multiAvg)],
      chartType: 'bar',
    },
    category: 'productivity',
  };
}

function detectFrequencyPreference(sessions: StudySession[]): PatternInsight | null {
  const sessionsByDate = new Map<string, StudySession[]>();
  for (const s of sessions) {
    const d = s.started_at.split('T')[0];
    if (!sessionsByDate.has(d)) sessionsByDate.set(d, []);
    sessionsByDate.get(d)!.push(s);
  }

  let fewLongMins = 0;
  let fewLongDays = 0;
  let manyShortMins = 0;
  let manyShortDays = 0;

  for (const [, daySessions] of Array.from(sessionsByDate.entries())) {
    const totalMins = daySessions.reduce((s, sess) => s + sess.duration_minutes, 0);
    if (daySessions.length <= 2 && totalMins > 0) {
      const avgLen = totalMins / daySessions.length;
      if (avgLen >= 45) {
        fewLongMins += totalMins;
        fewLongDays++;
      }
    }
    if (daySessions.length >= 3) {
      manyShortMins += totalMins;
      manyShortDays++;
    }
  }

  if (fewLongDays < 3 && manyShortDays < 3) return null;

  const fewLongAvg = fewLongDays > 0 ? fewLongMins / fewLongDays : 0;
  const manyShortAvg = manyShortDays > 0 ? manyShortMins / manyShortDays : 0;

  const total = fewLongDays + manyShortDays;
  if (total === 0) return null;

  const preference = fewLongDays > manyShortDays ? 'few focused' : 'many short';
  const confidence = Math.min(0.95, 0.5 + Math.abs(fewLongDays - manyShortDays) / total * 0.5);
  if (confidence < 0.7) return null;

  return {
    id: 'frequency-preference',
    title: `You prefer ${preference} sessions`,
    description: preference === 'few focused'
      ? `${fewLongDays} days with 1-2 focused sessions (avg ${Math.round(fewLongAvg)} min/day) vs ${manyShortDays} days with 3+ sessions.`
      : `${manyShortDays} days with 3+ short sessions (avg ${Math.round(manyShortAvg)} min/day) vs ${fewLongDays} days with focused sessions.`,
    confidence: Math.round(confidence * 100) / 100,
    supportingData: {
      labels: ['Focused', 'Multiple'],
      values: [Math.round(fewLongAvg), Math.round(manyShortAvg)],
      chartType: 'bar',
    },
    category: 'duration',
  };
}

export function detectPatterns(sessions: StudySession[]): PatternInsight[] {
  // Need at least 14 days of data and 10 sessions
  if (sessions.length < 10) return [];

  const dates = new Set(sessions.map((s) => s.started_at.split('T')[0]));
  if (dates.size < 14) return [];

  const detectors = [
    detectBestStudyDay,
    detectBestStudyTime,
    detectOptimalSessionLength,
    detectMorningVsEvening,
    detectStreakMomentum,
    detectWeekendVsWeekday,
    detectCourseSwitchingCost,
    detectFrequencyPreference,
  ];

  const results: PatternInsight[] = [];
  for (const detector of detectors) {
    const insight = detector(sessions);
    if (insight && insight.confidence >= 0.7) {
      results.push(insight);
    }
  }

  // Sort by confidence desc, return top 4
  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}
