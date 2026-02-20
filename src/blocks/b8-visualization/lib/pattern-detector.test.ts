import { describe, it, expect } from 'vitest';
import { detectPatterns, type PatternInsight } from './pattern-detector';
import type { StudySession } from '@/lib/types';

function generateSessions(count: number, daySpan: number): StudySession[] {
  const sessions: StudySession[] = [];
  const base = new Date('2026-01-01T00:00:00Z');

  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor((i / count) * daySpan);
    const date = new Date(base);
    date.setUTCDate(date.getUTCDate() + dayOffset);

    // Vary start hours to create patterns
    const hour = 8 + (i % 12); // 8AM to 7PM range
    date.setUTCHours(hour, 0, 0, 0);

    const duration = 30 + (i % 5) * 15; // 30-90 minutes

    sessions.push({
      id: `session-${i}`,
      user_id: 'user-1',
      course_id: `course-${i % 3}`,
      started_at: date.toISOString(),
      ended_at: new Date(date.getTime() + duration * 60000).toISOString(),
      duration_minutes: duration,
      modules_completed: Math.floor(duration / 30),
      session_type: 'manual',
      notes: null,
      created_at: date.toISOString(),
    });
  }
  return sessions;
}

describe('detectPatterns', () => {
  it('returns empty array for no sessions', () => {
    expect(detectPatterns([])).toEqual([]);
  });

  it('returns empty array for fewer than 10 sessions', () => {
    const sessions = generateSessions(9, 20);
    expect(detectPatterns(sessions)).toEqual([]);
  });

  it('returns empty array for fewer than 14 unique dates', () => {
    // 15 sessions but all on same 5 days
    const sessions: StudySession[] = [];
    const base = new Date('2026-01-01T10:00:00Z');
    for (let i = 0; i < 15; i++) {
      const date = new Date(base);
      date.setUTCDate(date.getUTCDate() + (i % 5));
      sessions.push({
        id: `s-${i}`,
        user_id: 'u1',
        course_id: 'c1',
        started_at: date.toISOString(),
        ended_at: new Date(date.getTime() + 60 * 60000).toISOString(),
        duration_minutes: 60,
        modules_completed: 1,
        session_type: 'manual',
        notes: null,
        created_at: date.toISOString(),
      });
    }
    expect(detectPatterns(sessions)).toEqual([]);
  });

  it('returns insights for sufficient data', () => {
    const sessions = generateSessions(30, 30);
    const insights = detectPatterns(sessions);
    // May return 0-4 insights depending on data patterns
    expect(insights.length).toBeLessThanOrEqual(4);
    // Each insight should have required fields
    for (const insight of insights) {
      expect(insight.id).toBeTruthy();
      expect(insight.title).toBeTruthy();
      expect(insight.description).toBeTruthy();
      expect(insight.confidence).toBeGreaterThanOrEqual(0.7);
      expect(insight.supportingData).toBeDefined();
      expect(insight.supportingData.labels).toBeDefined();
      expect(insight.supportingData.values).toBeDefined();
      expect(['bar', 'line']).toContain(insight.supportingData.chartType);
      expect(['timing', 'duration', 'consistency', 'productivity']).toContain(insight.category);
    }
  });

  it('returns max 4 insights', () => {
    // Create data that should trigger many patterns
    const sessions = generateSessions(60, 45);
    const insights = detectPatterns(sessions);
    expect(insights.length).toBeLessThanOrEqual(4);
  });

  it('sorts insights by confidence descending', () => {
    const sessions = generateSessions(40, 35);
    const insights = detectPatterns(sessions);
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i - 1].confidence).toBeGreaterThanOrEqual(insights[i].confidence);
    }
  });

  it('all insights have confidence >= 0.7', () => {
    const sessions = generateSessions(50, 40);
    const insights = detectPatterns(sessions);
    for (const insight of insights) {
      expect(insight.confidence).toBeGreaterThanOrEqual(0.7);
    }
  });
});
