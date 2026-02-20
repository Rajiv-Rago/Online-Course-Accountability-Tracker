import {
  courseAnalysisResponseSchema,
  weeklyReportResponseSchema,
  type CourseAnalysisResponse,
  type WeeklyReportResponse,
} from './analysis-validation';

// ---------------------------------------------------------------------------
// Clean raw GPT output — handles markdown fences, BOM, trailing commas
// ---------------------------------------------------------------------------

export function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();

  // Strip BOM
  if (cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1);
  }

  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  return cleaned.trim();
}

// ---------------------------------------------------------------------------
// Parse + validate course analysis response
// ---------------------------------------------------------------------------

export function parseCourseAnalysisResponse(raw: string): CourseAnalysisResponse {
  const cleaned = cleanJsonOutput(raw);
  const parsed = JSON.parse(cleaned);
  return courseAnalysisResponseSchema.parse(parsed);
}

// ---------------------------------------------------------------------------
// Parse + validate weekly report response
// ---------------------------------------------------------------------------

export function parseWeeklyReportResponse(raw: string): WeeklyReportResponse {
  const cleaned = cleanJsonOutput(raw);
  const parsed = JSON.parse(cleaned);
  return weeklyReportResponseSchema.parse(parsed);
}
