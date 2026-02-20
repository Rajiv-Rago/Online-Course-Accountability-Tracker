import { addDays, format, parseISO, differenceInDays } from 'date-fns';

export interface ForecastInput {
  dailyCumulativeHours: { date: string; hours: number }[];
  totalCourseHours: number | null;
  completedHours: number;
  targetDate: string | null;
}

export interface ForecastResult {
  predictedDate: string | null;
  status: 'ahead' | 'on_track' | 'behind' | 'stalled' | 'insufficient_data';
  velocity: number; // hours per day
  confidence70: { earliest: string; latest: string } | null;
  confidence90: { earliest: string; latest: string } | null;
  projectedPoints: ForecastPoint[];
}

export interface ForecastPoint {
  date: string;
  actual: number | null;
  projected: number | null;
  ci70Upper: number | null;
  ci70Lower: number | null;
  ci90Upper: number | null;
  ci90Lower: number | null;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

export function linearRegression(points: [number, number][]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  const sumX = points.reduce((s, [x]) => s + x, 0);
  const sumY = points.reduce((s, [, y]) => s + y, 0);
  const sumXY = points.reduce((s, [x, y]) => s + x * y, 0);
  const sumX2 = points.reduce((s, [x]) => s + x * x, 0);
  const sumY2 = points.reduce((s, [, y]) => s + y * y, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = points.reduce(
    (s, [x, y]) => s + (y - (slope * x + intercept)) ** 2,
    0,
  );
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, rSquared };
}

export function calculateForecast(input: ForecastInput): ForecastResult {
  const { dailyCumulativeHours, totalCourseHours, completedHours, targetDate } = input;

  if (dailyCumulativeHours.length < 7) {
    return {
      predictedDate: null,
      status: 'insufficient_data',
      velocity: 0,
      confidence70: null,
      confidence90: null,
      projectedPoints: [],
    };
  }

  // Build regression points: x = day index, y = cumulative hours
  const baseDate = parseISO(dailyCumulativeHours[0].date);
  const regressionPoints: [number, number][] = dailyCumulativeHours.map((d) => [
    differenceInDays(parseISO(d.date), baseDate),
    d.hours,
  ]);

  const { slope, intercept } = linearRegression(regressionPoints);

  // Velocity is slope (hours per day)
  const velocity = slope;

  // If no total hours set, we can't forecast completion
  if (!totalCourseHours || totalCourseHours <= 0) {
    const actualPoints: ForecastPoint[] = dailyCumulativeHours.map((d) => ({
      date: d.date,
      actual: d.hours,
      projected: null,
      ci70Upper: null,
      ci70Lower: null,
      ci90Upper: null,
      ci90Lower: null,
    }));
    return {
      predictedDate: null,
      status: velocity <= 0 ? 'stalled' : 'on_track',
      velocity,
      confidence70: null,
      confidence90: null,
      projectedPoints: actualPoints,
    };
  }

  if (velocity <= 0) {
    const actualPoints: ForecastPoint[] = dailyCumulativeHours.map((d) => ({
      date: d.date,
      actual: d.hours,
      projected: null,
      ci70Upper: null,
      ci70Lower: null,
      ci90Upper: null,
      ci90Lower: null,
    }));
    return {
      predictedDate: null,
      status: 'stalled',
      velocity: 0,
      confidence70: null,
      confidence90: null,
      projectedPoints: actualPoints,
    };
  }

  // Calculate days to completion
  const lastPoint = dailyCumulativeHours[dailyCumulativeHours.length - 1];
  const lastDayIndex = differenceInDays(parseISO(lastPoint.date), baseDate);
  const lastPredicted = slope * lastDayIndex + intercept;
  const daysToCompletion = (totalCourseHours - lastPredicted) / slope;

  const predictedDate = addDays(parseISO(lastPoint.date), Math.ceil(daysToCompletion));
  const predictedDateStr = format(predictedDate, 'yyyy-MM-dd');

  // Calculate standard error of residuals
  const n = regressionPoints.length;
  const meanX = regressionPoints.reduce((s, [x]) => s + x, 0) / n;
  const ssX = regressionPoints.reduce((s, [x]) => s + (x - meanX) ** 2, 0);
  const ssRes = regressionPoints.reduce(
    (s, [x, y]) => s + (y - (slope * x + intercept)) ** 2,
    0,
  );
  const stdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  // Confidence intervals for predicted completion date
  function ciDays(tValue: number): number {
    if (stdError === 0 || velocity === 0) return 0;
    const futureDist = daysToCompletion;
    const predictionVar = stdError * Math.sqrt(1 + 1 / n + ((lastDayIndex + futureDist - meanX) ** 2) / ssX);
    return Math.ceil((tValue * predictionVar) / velocity);
  }

  const ci70Days = ciDays(1.04);
  const ci90Days = ciDays(1.645);

  const confidence70 = {
    earliest: format(addDays(predictedDate, -ci70Days), 'yyyy-MM-dd'),
    latest: format(addDays(predictedDate, ci70Days), 'yyyy-MM-dd'),
  };
  const confidence90 = {
    earliest: format(addDays(predictedDate, -ci90Days), 'yyyy-MM-dd'),
    latest: format(addDays(predictedDate, ci90Days), 'yyyy-MM-dd'),
  };

  // Determine status
  let status: ForecastResult['status'] = 'on_track';
  if (targetDate) {
    const daysUntilTarget = differenceInDays(parseISO(targetDate), parseISO(lastPoint.date));
    const daysUntilPredicted = Math.ceil(daysToCompletion);

    if (daysUntilPredicted < daysUntilTarget - 7) {
      status = 'ahead';
    } else if (daysUntilPredicted > daysUntilTarget + 7) {
      status = 'behind';
    }
  }

  // Build projected points: actual + future projection
  const projectedPoints: ForecastPoint[] = [];

  // Historical actual points
  for (const d of dailyCumulativeHours) {
    projectedPoints.push({
      date: d.date,
      actual: d.hours,
      projected: null,
      ci70Upper: null,
      ci70Lower: null,
      ci90Upper: null,
      ci90Lower: null,
    });
  }

  // Future projected points (daily up to predicted date + buffer)
  const projectionDays = Math.min(Math.ceil(daysToCompletion) + 14, 180);
  for (let i = 1; i <= projectionDays; i++) {
    const futureDate = addDays(parseISO(lastPoint.date), i);
    const futureDateStr = format(futureDate, 'yyyy-MM-dd');
    const dayIdx = lastDayIndex + i;
    const projectedHours = Math.min(slope * dayIdx + intercept, totalCourseHours);

    const dist = dayIdx - meanX;
    const predVar = stdError * Math.sqrt(1 + 1 / n + (dist * dist) / ssX);

    projectedPoints.push({
      date: futureDateStr,
      actual: null,
      projected: Math.round(projectedHours * 100) / 100,
      ci70Upper: Math.min(Math.round((projectedHours + 1.04 * predVar) * 100) / 100, totalCourseHours),
      ci70Lower: Math.max(Math.round((projectedHours - 1.04 * predVar) * 100) / 100, 0),
      ci90Upper: Math.min(Math.round((projectedHours + 1.645 * predVar) * 100) / 100, totalCourseHours),
      ci90Lower: Math.max(Math.round((projectedHours - 1.645 * predVar) * 100) / 100, 0),
    });
  }

  return {
    predictedDate: predictedDateStr,
    status,
    velocity: Math.round(velocity * 1000) / 1000,
    confidence70,
    confidence90,
    projectedPoints,
  };
}
