import { vi } from 'vitest';

/**
 * Create a mock OpenAI response with valid schema-conforming JSON.
 */
export function createMockAnalysisResponse(overrides?: Partial<MockAnalysis>) {
  const analysis: MockAnalysis = {
    risk_score: 35,
    risk_level: 'medium',
    insights: [
      {
        type: 'suggestion',
        title: 'Increase study frequency',
        description: 'Try to study at least 30 minutes daily.',
        confidence: 0.85,
      },
    ],
    interventions: [
      {
        type: 'encouragement',
        message: 'Great progress on completing modules!',
        priority: 'low',
        action_url: null,
      },
    ],
    patterns: {
      optimal_time: '18:00-19:00',
      avg_session_length: 45,
      consistency_score: 0.7,
      preferred_day: 'monday',
    },
    ...overrides,
  };

  return {
    choices: [
      {
        message: {
          content: JSON.stringify(analysis),
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 500,
      completion_tokens: 200,
      total_tokens: 700,
    },
  };
}

export function createMockWeeklyReportResponse(overrides?: Record<string, unknown>) {
  const report = {
    ai_summary: 'This week you made solid progress on 2 courses.',
    highlights: ['Completed 5 modules', 'Maintained 7-day streak'],
    recommendations: [
      { type: 'schedule', message: 'Try studying in the morning for better retention.' },
      { type: 'goal', message: 'Set a target to complete 3 more modules next week.' },
    ],
    ...overrides,
  };

  return {
    choices: [
      {
        message: {
          content: JSON.stringify(report),
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 800,
      completion_tokens: 300,
      total_tokens: 1100,
    },
  };
}

interface MockAnalysis {
  risk_score: number;
  risk_level: string;
  insights: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
  }>;
  interventions: Array<{
    type: string;
    message: string;
    priority: string;
    action_url: string | null;
  }>;
  patterns: {
    optimal_time: string | null;
    avg_session_length: number;
    consistency_score: number;
    preferred_day: string | null;
  };
}
