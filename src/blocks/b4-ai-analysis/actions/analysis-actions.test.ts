import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser } from '@/test/helpers/auth';
import { buildAnalysis, buildWeeklyReport } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
});

describe('fetchLatestAnalyses', () => {
  it('deduplicates analyses keeping only the latest per course_id', async () => {
    const analyses = [
      {
        ...buildAnalysis({ course_id: 'c1', created_at: '2024-06-15T10:00:00Z', risk_score: 40 }),
        courses: { title: 'Course A', platform: 'udemy' },
      },
      {
        ...buildAnalysis({ course_id: 'c1', created_at: '2024-06-14T10:00:00Z', risk_score: 60 }),
        courses: { title: 'Course A', platform: 'udemy' },
      },
      {
        ...buildAnalysis({ course_id: 'c2', created_at: '2024-06-15T10:00:00Z', risk_score: 80 }),
        courses: { title: 'Course B', platform: null },
      },
    ];
    mockClient.__setTableResult('ai_analyses', { data: analyses, error: null });

    const { fetchLatestAnalyses } = await import('./analysis-actions');
    const result = await fetchLatestAnalyses();

    // Should keep only first occurrence per course_id (c1 at risk_score 40, c2 at risk_score 80)
    expect(result.data).toHaveLength(2);
    const courseIds = result.data!.map((a) => a.course_id);
    expect(courseIds).toContain('c1');
    expect(courseIds).toContain('c2');

    // The c1 entry should be the first (latest) one, not the older one
    const c1Analysis = result.data!.find((a) => a.course_id === 'c1');
    expect(c1Analysis!.risk_score).toBe(40);
  });

  it('transforms nested courses join into flat course_title and course_platform fields', async () => {
    const analyses = [
      {
        ...buildAnalysis({ course_id: 'c1' }),
        courses: { title: 'React Mastery', platform: 'coursera' },
      },
    ];
    mockClient.__setTableResult('ai_analyses', { data: analyses, error: null });

    const { fetchLatestAnalyses } = await import('./analysis-actions');
    const result = await fetchLatestAnalyses();

    expect(result.data![0].course_title).toBe('React Mastery');
    expect(result.data![0].course_platform).toBe('coursera');
    // The nested 'courses' key should not leak into the output
    expect((result.data![0] as unknown as Record<string, unknown>).courses).toBeUndefined();
  });

  it('returns empty array when no analyses exist', async () => {
    mockClient.__setTableResult('ai_analyses', { data: [], error: null });

    const { fetchLatestAnalyses } = await import('./analysis-actions');
    const result = await fetchLatestAnalyses();
    expect(result.data).toEqual([]);
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { fetchLatestAnalyses } = await import('./analysis-actions');
    const result = await fetchLatestAnalyses();
    expect(result.error).toBe('Unauthorized');
  });

  it('propagates DB error', async () => {
    mockClient.__setTableResult('ai_analyses', { data: null, error: { message: 'Connection refused' } });

    const { fetchLatestAnalyses } = await import('./analysis-actions');
    const result = await fetchLatestAnalyses();
    expect(result.error).toBe('Connection refused');
  });
});

describe('fetchAnalysisHistory', () => {
  it('returns analysis history for a specific course', async () => {
    const analyses = [
      buildAnalysis({ risk_score: 50, created_at: '2024-06-15T10:00:00Z' }),
      buildAnalysis({ risk_score: 30, created_at: '2024-06-14T10:00:00Z' }),
    ];
    mockClient.__setTableResult('ai_analyses', { data: analyses, error: null });

    const { fetchAnalysisHistory } = await import('./analysis-actions');
    const result = await fetchAnalysisHistory('course-1');

    expect(result.data).toHaveLength(2);
    expect(result.data![0].risk_score).toBe(50);
    expect(result.data![1].risk_score).toBe(30);
  });

  it('returns empty array when no history exists', async () => {
    mockClient.__setTableResult('ai_analyses', { data: [], error: null });

    const { fetchAnalysisHistory } = await import('./analysis-actions');
    const result = await fetchAnalysisHistory('course-1');
    expect(result.data).toEqual([]);
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { fetchAnalysisHistory } = await import('./analysis-actions');
    const result = await fetchAnalysisHistory('course-1');
    expect(result.error).toBe('Unauthorized');
  });
});

describe('fetchWeeklyReport', () => {
  it('returns the most recent weekly report when no weekStart specified', async () => {
    const report = buildWeeklyReport({ week_start: '2024-06-10', total_minutes: 320 });
    mockClient.__setTableResult('weekly_reports', { data: report, error: null });

    const { fetchWeeklyReport } = await import('./analysis-actions');
    const result = await fetchWeeklyReport();

    expect(result.data).toBeDefined();
    expect(result.data!.week_start).toBe('2024-06-10');
    expect(result.data!.total_minutes).toBe(320);
  });

  it('returns null when no reports exist', async () => {
    mockClient.__setTableResult('weekly_reports', { data: null, error: null });

    const { fetchWeeklyReport } = await import('./analysis-actions');
    const result = await fetchWeeklyReport();
    expect(result.data).toBeNull();
  });

  it('returns report for specific week_start', async () => {
    const report = buildWeeklyReport({ week_start: '2024-06-03', total_sessions: 8 });
    mockClient.__setTableResult('weekly_reports', { data: report, error: null });

    const { fetchWeeklyReport } = await import('./analysis-actions');
    const result = await fetchWeeklyReport('2024-06-03');
    expect(result.data!.week_start).toBe('2024-06-03');
    expect(result.data!.total_sessions).toBe(8);
  });
});

describe('fetchWeeklyReportDates', () => {
  it('extracts week_start strings from report rows', async () => {
    mockClient.__setTableResult('weekly_reports', {
      data: [{ week_start: '2024-06-10' }, { week_start: '2024-06-03' }, { week_start: '2024-05-27' }],
      error: null,
    });

    const { fetchWeeklyReportDates } = await import('./analysis-actions');
    const result = await fetchWeeklyReportDates();
    expect(result.data).toEqual(['2024-06-10', '2024-06-03', '2024-05-27']);
  });

  it('returns empty array when no reports exist', async () => {
    mockClient.__setTableResult('weekly_reports', { data: [], error: null });

    const { fetchWeeklyReportDates } = await import('./analysis-actions');
    const result = await fetchWeeklyReportDates();
    expect(result.data).toEqual([]);
  });
});

describe('fetchRiskSummary', () => {
  it('computes weighted average risk based on course priority', async () => {
    // Priority 1 (weight 4), priority 3 (weight 2)
    const analyses = [
      {
        course_id: 'c1', risk_score: 80, risk_level: 'high',
        courses: { title: 'Critical Course', priority: 1, status: 'in_progress' },
      },
      {
        course_id: 'c2', risk_score: 20, risk_level: 'low',
        courses: { title: 'Low Priority', priority: 3, status: 'in_progress' },
      },
    ];
    mockClient.__setTableResult('ai_analyses', { data: analyses, error: null });

    const { fetchRiskSummary } = await import('./analysis-actions');
    const result = await fetchRiskSummary();

    // Weighted average: (80*4 + 20*2) / (4+2) = (320+40)/6 = 360/6 = 60
    expect(result.data!.averageRisk).toBe(60);
    expect(result.data!.totalCourses).toBe(2);
  });

  it('counts risk distribution correctly', async () => {
    const analyses = [
      { course_id: 'c1', risk_score: 10, risk_level: 'low', courses: { title: 'A', priority: 2, status: 'in_progress' } },
      { course_id: 'c2', risk_score: 40, risk_level: 'medium', courses: { title: 'B', priority: 2, status: 'in_progress' } },
      { course_id: 'c3', risk_score: 70, risk_level: 'high', courses: { title: 'C', priority: 2, status: 'in_progress' } },
      { course_id: 'c4', risk_score: 95, risk_level: 'critical', courses: { title: 'D', priority: 2, status: 'in_progress' } },
      { course_id: 'c5', risk_score: 15, risk_level: 'low', courses: { title: 'E', priority: 2, status: 'in_progress' } },
    ];
    mockClient.__setTableResult('ai_analyses', { data: analyses, error: null });

    const { fetchRiskSummary } = await import('./analysis-actions');
    const result = await fetchRiskSummary();

    expect(result.data!.riskDistribution).toEqual({
      low: 2,
      medium: 1,
      high: 1,
      critical: 1,
    });
  });

  it('identifies highest risk course', async () => {
    const analyses = [
      { course_id: 'c1', risk_score: 30, risk_level: 'low', courses: { title: 'Safe', priority: 2, status: 'in_progress' } },
      { course_id: 'c2', risk_score: 90, risk_level: 'critical', courses: { title: 'Danger Zone', priority: 1, status: 'in_progress' } },
      { course_id: 'c3', risk_score: 50, risk_level: 'medium', courses: { title: 'Moderate', priority: 2, status: 'in_progress' } },
    ];
    mockClient.__setTableResult('ai_analyses', { data: analyses, error: null });

    const { fetchRiskSummary } = await import('./analysis-actions');
    const result = await fetchRiskSummary();

    expect(result.data!.highestRiskCourse).toEqual({
      courseId: 'c2',
      title: 'Danger Zone',
      riskScore: 90,
      riskLevel: 'critical',
    });
  });

  it('excludes non-in_progress courses from summary', async () => {
    const analyses = [
      { course_id: 'c1', risk_score: 30, risk_level: 'low', courses: { title: 'Active', priority: 2, status: 'in_progress' } },
      { course_id: 'c2', risk_score: 90, risk_level: 'critical', courses: { title: 'Done', priority: 1, status: 'completed' } },
      { course_id: 'c3', risk_score: 80, risk_level: 'high', courses: { title: 'Dropped', priority: 2, status: 'abandoned' } },
    ];
    mockClient.__setTableResult('ai_analyses', { data: analyses, error: null });

    const { fetchRiskSummary } = await import('./analysis-actions');
    const result = await fetchRiskSummary();

    // Only c1 should be included
    expect(result.data!.totalCourses).toBe(1);
    expect(result.data!.highestRiskCourse!.courseId).toBe('c1');
    expect(result.data!.riskDistribution.critical).toBe(0);
  });

  it('returns zero values when no analyses exist', async () => {
    mockClient.__setTableResult('ai_analyses', { data: [], error: null });

    const { fetchRiskSummary } = await import('./analysis-actions');
    const result = await fetchRiskSummary();

    expect(result.data!.totalCourses).toBe(0);
    expect(result.data!.averageRisk).toBe(0);
    expect(result.data!.highestRiskCourse).toBeNull();
    expect(result.data!.riskDistribution).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
  });

  it('deduplicates keeping only latest analysis per course', async () => {
    const analyses = [
      { course_id: 'c1', risk_score: 80, risk_level: 'high', courses: { title: 'Course', priority: 2, status: 'in_progress' } },
      { course_id: 'c1', risk_score: 20, risk_level: 'low', courses: { title: 'Course', priority: 2, status: 'in_progress' } },
    ];
    mockClient.__setTableResult('ai_analyses', { data: analyses, error: null });

    const { fetchRiskSummary } = await import('./analysis-actions');
    const result = await fetchRiskSummary();

    // Should only count c1 once, with risk_score 80 (first/latest entry)
    expect(result.data!.totalCourses).toBe(1);
    expect(result.data!.riskDistribution.high).toBe(1);
    expect(result.data!.riskDistribution.low).toBe(0);
  });
});
