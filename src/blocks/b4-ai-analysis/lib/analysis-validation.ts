import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas that match the actual DB/type definitions in shared.ts
// Used to validate GPT-4 JSON output before inserting into ai_analyses
// ---------------------------------------------------------------------------

export const insightSchema = z.object({
  type: z.enum(['positive', 'warning', 'suggestion', 'neutral']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1),
});

export const interventionSchema = z.object({
  type: z.enum(['encouragement', 'action', 'reminder', 'escalation']),
  message: z.string().min(1).max(1000),
  priority: z.enum(['low', 'medium', 'high']),
  action_url: z.string().nullable().default(null),
});

export const patternSchema = z.object({
  optimal_time: z.string().nullable().default(null),
  avg_session_length: z.number().min(0),
  consistency_score: z.number().min(0).max(1),
  preferred_day: z.string().nullable().default(null),
}).passthrough(); // allow additional detected patterns

export const courseAnalysisResponseSchema = z.object({
  risk_score: z.number().min(0).max(100),
  insights: z.array(insightSchema).min(1).max(10),
  interventions: z.array(interventionSchema).max(5),
  patterns: patternSchema.nullable().default(null),
});

export type CourseAnalysisResponse = z.infer<typeof courseAnalysisResponseSchema>;

export const weeklyReportResponseSchema = z.object({
  ai_summary: z.string().min(1).max(2000),
  highlights: z.array(z.string().max(500)).max(10),
  recommendations: z.array(
    z.object({
      type: z.enum(['schedule', 'goal', 'technique', 'social']),
      message: z.string().min(1).max(500),
    })
  ).max(10),
});

export type WeeklyReportResponse = z.infer<typeof weeklyReportResponseSchema>;
