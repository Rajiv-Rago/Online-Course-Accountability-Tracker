import type { RiskLevel } from '@/lib/types';

// ---------------------------------------------------------------------------
// Risk calculation context — gathered from DB before calling GPT-4
// ---------------------------------------------------------------------------
export interface RiskContext {
  daysInactive: number;
  streakBroken: boolean;
  hoursLastWeek: number;
  hoursPrevWeek: number;
  progressPercent: number;
  expectedProgressPercent: number;
  daysUntilDeadline: number | null; // null = no deadline
  priority: number; // 1-4
}

interface RiskAdjustment {
  factor: string;
  delta: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  adjustments: RiskAdjustment[];
}

// ---------------------------------------------------------------------------
// Pure risk scoring functions
// ---------------------------------------------------------------------------

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

export function calculateExpectedProgress(
  startDate: string,
  targetDate: string,
  today: string
): number {
  const start = new Date(startDate).getTime();
  const target = new Date(targetDate).getTime();
  const now = new Date(today).getTime();

  if (target <= start) return 100;
  const elapsed = Math.max(0, now - start);
  const total = target - start;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

export function calculateAdjustedRisk(
  ctx: RiskContext,
  aiRiskScore: number
): RiskResult {
  const adjustments: RiskAdjustment[] = [];
  let score = aiRiskScore;

  // Days inactive: +5 per day after 2 days
  if (ctx.daysInactive > 2) {
    const delta = (ctx.daysInactive - 2) * 5;
    adjustments.push({ factor: 'Days inactive', delta });
    score += delta;
  }

  // Streak broken: +10
  if (ctx.streakBroken) {
    adjustments.push({ factor: 'Streak broken', delta: 10 });
    score += 10;
  }

  // Hours trend declining: +15 if <50% of previous week
  if (ctx.hoursPrevWeek > 0 && ctx.hoursLastWeek < ctx.hoursPrevWeek * 0.5) {
    adjustments.push({ factor: 'Study hours declining', delta: 15 });
    score += 15;
  }

  // Behind expected progress: +10 if >20% behind
  const progressGap = ctx.expectedProgressPercent - ctx.progressPercent;
  if (progressGap > 20) {
    adjustments.push({ factor: 'Behind expected progress', delta: 10 });
    score += 10;
  }

  // Deadline proximity: +20 if <7 days remaining and <80% done
  if (
    ctx.daysUntilDeadline !== null &&
    ctx.daysUntilDeadline < 7 &&
    ctx.progressPercent < 80
  ) {
    adjustments.push({ factor: 'Deadline approaching', delta: 20 });
    score += 20;
  }

  // Priority boost: higher priority courses get amplified risk
  if (ctx.priority === 1) {
    const delta = Math.round(score * 0.1);
    if (delta > 0) {
      adjustments.push({ factor: 'Highest priority', delta });
      score += delta;
    }
  }

  // Clamp to [0, 100]
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    level: riskLevelFromScore(score),
    adjustments,
  };
}
