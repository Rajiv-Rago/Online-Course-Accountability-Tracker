import { describe, it, expect } from 'vitest';
import {
  insightSchema,
  interventionSchema,
  courseAnalysisResponseSchema,
  weeklyReportResponseSchema,
} from './analysis-validation';

// ---------------------------------------------------------------------------
// Helpers – reusable valid objects
// ---------------------------------------------------------------------------

function validInsight(overrides = {}) {
  return {
    type: 'positive' as const,
    title: 'Great progress',
    description: 'You have completed 80% of the course.',
    confidence: 0.85,
    ...overrides,
  };
}

function validIntervention(overrides = {}) {
  return {
    type: 'encouragement' as const,
    message: 'Keep up the good work!',
    priority: 'medium' as const,
    action_url: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// insightSchema
// ---------------------------------------------------------------------------

describe('insightSchema', () => {
  it('accepts valid insight', () => {
    const result = insightSchema.safeParse(validInsight());
    expect(result.success).toBe(true);
  });

  it('rejects confidence below 0', () => {
    const result = insightSchema.safeParse(validInsight({ confidence: -0.1 }));
    expect(result.success).toBe(false);
  });

  it('rejects confidence above 1', () => {
    const result = insightSchema.safeParse(validInsight({ confidence: 1.01 }));
    expect(result.success).toBe(false);
  });

  it('accepts confidence of exactly 0', () => {
    const result = insightSchema.safeParse(validInsight({ confidence: 0 }));
    expect(result.success).toBe(true);
  });

  it('accepts confidence of exactly 1', () => {
    const result = insightSchema.safeParse(validInsight({ confidence: 1 }));
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = insightSchema.safeParse(validInsight({ title: '' }));
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 200 characters', () => {
    const result = insightSchema.safeParse(validInsight({ title: 'A'.repeat(201) }));
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = insightSchema.safeParse(validInsight({ description: '' }));
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// interventionSchema
// ---------------------------------------------------------------------------

describe('interventionSchema', () => {
  it('accepts valid intervention', () => {
    const result = interventionSchema.safeParse(validIntervention());
    expect(result.success).toBe(true);
  });

  it('accepts intervention with valid URL', () => {
    const result = interventionSchema.safeParse(
      validIntervention({ action_url: 'https://example.com/action' })
    );
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL', () => {
    const result = interventionSchema.safeParse(
      validIntervention({ action_url: 'not-a-url' })
    );
    expect(result.success).toBe(false);
  });

  it('accepts null action_url', () => {
    const result = interventionSchema.safeParse(
      validIntervention({ action_url: null })
    );
    expect(result.success).toBe(true);
  });

  it('defaults action_url to null when not provided', () => {
    const { action_url: _, ...withoutUrl } = validIntervention();
    const result = interventionSchema.safeParse(withoutUrl);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action_url).toBeNull();
    }
  });

  it('rejects invalid type', () => {
    const result = interventionSchema.safeParse(
      validIntervention({ type: 'invalid_type' })
    );
    expect(result.success).toBe(false);
  });

  it('rejects empty message', () => {
    const result = interventionSchema.safeParse(
      validIntervention({ message: '' })
    );
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// courseAnalysisResponseSchema
// ---------------------------------------------------------------------------

describe('courseAnalysisResponseSchema', () => {
  it('accepts valid response', () => {
    const result = courseAnalysisResponseSchema.safeParse({
      risk_score: 42,
      insights: [validInsight()],
      interventions: [validIntervention()],
      patterns: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty insights array (min 1)', () => {
    const result = courseAnalysisResponseSchema.safeParse({
      risk_score: 42,
      insights: [],
      interventions: [],
      patterns: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects risk_score above 100', () => {
    const result = courseAnalysisResponseSchema.safeParse({
      risk_score: 101,
      insights: [validInsight()],
      interventions: [],
      patterns: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects risk_score below 0', () => {
    const result = courseAnalysisResponseSchema.safeParse({
      risk_score: -1,
      insights: [validInsight()],
      interventions: [],
      patterns: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 insights', () => {
    const insights = Array.from({ length: 11 }, () => validInsight());
    const result = courseAnalysisResponseSchema.safeParse({
      risk_score: 50,
      insights,
      interventions: [],
      patterns: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 5 interventions', () => {
    const interventions = Array.from({ length: 6 }, () => validIntervention());
    const result = courseAnalysisResponseSchema.safeParse({
      risk_score: 50,
      insights: [validInsight()],
      interventions,
      patterns: null,
    });
    expect(result.success).toBe(false);
  });

  it('defaults patterns to null when not provided', () => {
    const result = courseAnalysisResponseSchema.safeParse({
      risk_score: 50,
      insights: [validInsight()],
      interventions: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patterns).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// weeklyReportResponseSchema
// ---------------------------------------------------------------------------

describe('weeklyReportResponseSchema', () => {
  it('accepts valid report', () => {
    const result = weeklyReportResponseSchema.safeParse({
      ai_summary: 'You made solid progress this week.',
      highlights: ['Completed 3 modules', 'Logged 5 sessions'],
      recommendations: [
        { type: 'schedule', message: 'Try morning sessions for better focus' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty ai_summary', () => {
    const result = weeklyReportResponseSchema.safeParse({
      ai_summary: '',
      highlights: [],
      recommendations: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects ai_summary longer than 2000 characters', () => {
    const result = weeklyReportResponseSchema.safeParse({
      ai_summary: 'X'.repeat(2001),
      highlights: [],
      recommendations: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 highlights', () => {
    const highlights = Array.from({ length: 11 }, (_, i) => `Highlight ${i}`);
    const result = weeklyReportResponseSchema.safeParse({
      ai_summary: 'Summary',
      highlights,
      recommendations: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 recommendations', () => {
    const recommendations = Array.from({ length: 11 }, () => ({
      type: 'goal',
      message: 'Do something',
    }));
    const result = weeklyReportResponseSchema.safeParse({
      ai_summary: 'Summary',
      highlights: [],
      recommendations,
    });
    expect(result.success).toBe(false);
  });

  it('rejects highlight string longer than 500 characters', () => {
    const result = weeklyReportResponseSchema.safeParse({
      ai_summary: 'Summary',
      highlights: ['X'.repeat(501)],
      recommendations: [],
    });
    expect(result.success).toBe(false);
  });
});
