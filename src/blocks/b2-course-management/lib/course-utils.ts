import type { CourseStatus, RiskLevel } from '@/lib/types';

// Status transition rules
const VALID_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  not_started: ['in_progress'],
  in_progress: ['paused', 'completed', 'abandoned'],
  paused: ['in_progress', 'abandoned'],
  completed: [],
  abandoned: ['in_progress'],
};

export function isValidTransition(from: CourseStatus, to: CourseStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableTransitions(status: CourseStatus): CourseStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

export function getTransitionLabel(from: CourseStatus, to: CourseStatus): string {
  if (from === 'not_started' && to === 'in_progress') return 'Start Course';
  if (from === 'in_progress' && to === 'paused') return 'Pause';
  if (from === 'in_progress' && to === 'completed') return 'Mark Complete';
  if (from === 'in_progress' && to === 'abandoned') return 'Abandon';
  if (from === 'paused' && to === 'in_progress') return 'Resume';
  if (from === 'paused' && to === 'abandoned') return 'Abandon';
  if (from === 'abandoned' && to === 'in_progress') return 'Restart';
  return `Change to ${formatStatus(to)}`;
}

export function requiresConfirmation(from: CourseStatus, to: CourseStatus): boolean {
  if (to === 'completed') return true;
  if (to === 'abandoned') return true;
  if (from === 'abandoned' && to === 'in_progress') return true;
  return false;
}

export function formatStatus(status: CourseStatus): string {
  switch (status) {
    case 'not_started': return 'Not Started';
    case 'in_progress': return 'In Progress';
    case 'paused': return 'Paused';
    case 'completed': return 'Completed';
    case 'abandoned': return 'Abandoned';
    default: return status;
  }
}

export function getStatusColor(status: CourseStatus): string {
  switch (status) {
    case 'not_started': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    case 'paused': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
    case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
    case 'abandoned': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function calcProgress(completed: number, total: number | null): number {
  if (!total || total <= 0) return 0;
  return Math.min(Math.round((completed / total) * 100), 100);
}

export function calcDaysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function calcRequiredPace(
  remainingHours: number,
  daysRemaining: number
): number | null {
  if (daysRemaining <= 0) return null;
  return Math.round((remainingHours / daysRemaining) * 10) / 10;
}

export function riskLevel(score: number): RiskLevel {
  if (score <= 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'text-green-600 dark:text-green-400';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400';
    case 'high': return 'text-orange-600 dark:text-orange-400';
    case 'critical': return 'text-red-600 dark:text-red-400';
    default: return 'text-gray-600';
  }
}
