import { describe, it, expect } from 'vitest';
import { cleanJsonOutput, parseCourseAnalysisResponse, parseWeeklyReportResponse } from './response-parser';

const validAnalysis = JSON.stringify({
  risk_score: 35,
  insights: [{ type: 'suggestion', title: 'Study more', description: 'Try daily sessions.', confidence: 0.8 }],
  interventions: [{ type: 'encouragement', message: 'Good job!', priority: 'low', action_url: null }],
  patterns: { optimal_time: '18:00', avg_session_length: 45, consistency_score: 0.7, preferred_day: 'monday' },
});

const validWeeklyReport = JSON.stringify({
  ai_summary: 'Good week of study.',
  highlights: ['Completed 5 modules'],
  recommendations: [{ type: 'schedule', message: 'Study earlier.' }],
});

describe('cleanJsonOutput', () => {
  it('returns already clean JSON unchanged', () => {
    expect(cleanJsonOutput('{"a":1}')).toBe('{"a":1}');
  });

  it('strips markdown code fences with json label', () => {
    expect(cleanJsonOutput('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips markdown code fences without label', () => {
    expect(cleanJsonOutput('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips BOM character', () => {
    expect(cleanJsonOutput('\uFEFF{"a":1}')).toBe('{"a":1}');
  });

  it('removes trailing commas before }', () => {
    expect(cleanJsonOutput('{"a":1,}')).toBe('{"a":1}');
  });

  it('removes trailing commas before ]', () => {
    expect(cleanJsonOutput('[1,2,]')).toBe('[1,2]');
  });

  it('trims whitespace', () => {
    expect(cleanJsonOutput('  {"a":1}  ')).toBe('{"a":1}');
  });
});

describe('parseCourseAnalysisResponse', () => {
  it('parses valid JSON', () => {
    const result = parseCourseAnalysisResponse(validAnalysis);
    expect(result.risk_score).toBe(35);
    expect(result.insights).toHaveLength(1);
    expect(result.interventions).toHaveLength(1);
  });

  it('handles code-fenced response', () => {
    const result = parseCourseAnalysisResponse('```json\n' + validAnalysis + '\n```');
    expect(result.risk_score).toBe(35);
  });

  it('throws on invalid JSON syntax', () => {
    expect(() => parseCourseAnalysisResponse('not json')).toThrow();
  });

  it('throws on missing required field: insights', () => {
    const noInsights = JSON.stringify({ risk_score: 30, interventions: [], patterns: null });
    expect(() => parseCourseAnalysisResponse(noInsights)).toThrow();
  });

  it('throws when risk_score > 100', () => {
    const over = JSON.stringify({
      ...JSON.parse(validAnalysis),
      risk_score: 150,
    });
    expect(() => parseCourseAnalysisResponse(over)).toThrow();
  });

  it('throws when confidence > 1', () => {
    const data = JSON.parse(validAnalysis);
    data.insights[0].confidence = 1.5;
    expect(() => parseCourseAnalysisResponse(JSON.stringify(data))).toThrow();
  });

  it('throws when insights array is empty (min 1)', () => {
    const data = { ...JSON.parse(validAnalysis), insights: [] };
    expect(() => parseCourseAnalysisResponse(JSON.stringify(data))).toThrow();
  });

  it('accepts response with null patterns', () => {
    const data = { ...JSON.parse(validAnalysis), patterns: null };
    const result = parseCourseAnalysisResponse(JSON.stringify(data));
    expect(result.patterns).toBeNull();
  });
});

describe('parseWeeklyReportResponse', () => {
  it('parses valid response', () => {
    const result = parseWeeklyReportResponse(validWeeklyReport);
    expect(result.ai_summary).toBe('Good week of study.');
    expect(result.highlights).toHaveLength(1);
    expect(result.recommendations).toHaveLength(1);
  });

  it('throws when ai_summary is missing', () => {
    const noSummary = JSON.stringify({ highlights: [], recommendations: [] });
    expect(() => parseWeeklyReportResponse(noSummary)).toThrow();
  });

  it('throws when ai_summary is empty', () => {
    const empty = JSON.stringify({ ai_summary: '', highlights: [], recommendations: [] });
    expect(() => parseWeeklyReportResponse(empty)).toThrow();
  });
});
