import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildCourseAnalysisPrompt,
  buildWeeklyReportPrompt,
  estimateTokens,
  truncateHistory,
  type CourseAnalysisPromptContext,
  type WeeklyReportPromptContext,
} from './prompt-builder';

function buildCtx(overrides: Partial<CourseAnalysisPromptContext> = {}): CourseAnalysisPromptContext {
  return {
    course: {
      courseTitle: 'React Masterclass',
      platform: 'udemy',
      totalModules: 20,
      completedModules: 5,
      totalHours: 40,
      completedHours: 10,
      targetDate: '2026-06-01',
      priority: 2,
      status: 'in_progress',
      notes: null,
    },
    recentSessions: [
      { date: '2026-02-18', durationMinutes: 45, modulesCompleted: 1 },
      { date: '2026-02-19', durationMinutes: 60, modulesCompleted: 2 },
    ],
    daysInactive: 1,
    currentStreak: 7,
    motivationStyle: 'balanced',
    dailyGoalMins: 60,
    ...overrides,
  };
}

function buildWeeklyCtx(overrides: Partial<WeeklyReportPromptContext> = {}): WeeklyReportPromptContext {
  return {
    weekStart: '2026-02-16',
    weekEnd: '2026-02-22',
    totalMinutes: 300,
    totalSessions: 6,
    totalModules: 5,
    coursesSummary: [{ title: 'React Masterclass', minutes: 300, sessions: 6, modules: 5 }],
    streakLength: 7,
    previousWeekMinutes: 240,
    motivationStyle: 'balanced',
    ...overrides,
  };
}

describe('buildSystemPrompt', () => {
  it('mentions AI learning coach', () => {
    expect(buildSystemPrompt()).toContain('AI learning coach');
  });

  it('instructs valid JSON output', () => {
    expect(buildSystemPrompt()).toContain('valid JSON');
  });
});

describe('buildCourseAnalysisPrompt', () => {
  it('includes course title', () => {
    const prompt = buildCourseAnalysisPrompt(buildCtx());
    expect(prompt).toContain('React Masterclass');
  });

  it('includes priority', () => {
    const prompt = buildCourseAnalysisPrompt(buildCtx());
    expect(prompt).toContain('2/4');
  });

  it('includes recent sessions', () => {
    const prompt = buildCourseAnalysisPrompt(buildCtx());
    expect(prompt).toContain('2026-02-18');
    expect(prompt).toContain('45min');
  });

  it('shows "(no recent sessions)" when empty', () => {
    const prompt = buildCourseAnalysisPrompt(buildCtx({ recentSessions: [] }));
    expect(prompt).toContain('(no recent sessions)');
  });

  it('includes notes when provided', () => {
    const ctx = buildCtx();
    ctx.course.notes = 'Focus on hooks chapter';
    const prompt = buildCourseAnalysisPrompt(ctx);
    expect(prompt).toContain('Focus on hooks chapter');
  });

  it('uses gentle tone for gentle style', () => {
    const prompt = buildCourseAnalysisPrompt(buildCtx({ motivationStyle: 'gentle' }));
    expect(prompt).toContain('warm and encouraging');
  });

  it('uses drill sergeant tone', () => {
    const prompt = buildCourseAnalysisPrompt(buildCtx({ motivationStyle: 'drill_sergeant' }));
    expect(prompt).toContain('direct, blunt');
  });

  it('includes module progress', () => {
    const prompt = buildCourseAnalysisPrompt(buildCtx());
    expect(prompt).toContain('5/20 modules');
  });

  it('includes target date', () => {
    const prompt = buildCourseAnalysisPrompt(buildCtx());
    expect(prompt).toContain('2026-06-01');
  });
});

describe('buildWeeklyReportPrompt', () => {
  it('includes week dates', () => {
    const prompt = buildWeeklyReportPrompt(buildWeeklyCtx());
    expect(prompt).toContain('2026-02-16');
    expect(prompt).toContain('2026-02-22');
  });

  it('includes total minutes', () => {
    const prompt = buildWeeklyReportPrompt(buildWeeklyCtx());
    expect(prompt).toContain('300 minutes');
  });

  it('includes streak length', () => {
    const prompt = buildWeeklyReportPrompt(buildWeeklyCtx());
    expect(prompt).toContain('7 days');
  });

  it('shows previous week comparison', () => {
    const prompt = buildWeeklyReportPrompt(buildWeeklyCtx());
    expect(prompt).toContain('240 minutes');
  });

  it('shows "No previous week data" when null', () => {
    const prompt = buildWeeklyReportPrompt(buildWeeklyCtx({ previousWeekMinutes: null }));
    expect(prompt).toContain('No previous week data');
  });

  it('shows no courses message when empty', () => {
    const prompt = buildWeeklyReportPrompt(buildWeeklyCtx({ coursesSummary: [] }));
    expect(prompt).toContain('(no courses studied this week)');
  });
});

describe('estimateTokens', () => {
  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('a'.repeat(100))).toBe(25);
  });

  it('rounds up', () => {
    expect(estimateTokens('abc')).toBe(1);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('truncateHistory', () => {
  const sessions = [
    { date: '2026-02-18', durationMinutes: 45, modulesCompleted: 1 },
    { date: '2026-02-19', durationMinutes: 60, modulesCompleted: 2 },
    { date: '2026-02-20', durationMinutes: 30, modulesCompleted: 1 },
  ];

  it('returns all sessions if within token limit', () => {
    expect(truncateHistory(sessions, 10000)).toHaveLength(3);
  });

  it('truncates when over limit', () => {
    const result = truncateHistory(sessions, 20);
    expect(result.length).toBeLessThan(3);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for empty input', () => {
    expect(truncateHistory([], 100)).toHaveLength(0);
  });
});
