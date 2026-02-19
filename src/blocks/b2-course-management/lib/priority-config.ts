import type { CoursePriority } from '@/lib/types';

export interface PriorityConfig {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  sortWeight: number;
  description: string;
}

export const PRIORITIES: Record<CoursePriority, PriorityConfig> = {
  1: {
    label: 'Critical',
    shortLabel: 'P1',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-950',
    sortWeight: 1,
    description: 'Must complete ASAP',
  },
  2: {
    label: 'High',
    shortLabel: 'P2',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-950',
    sortWeight: 2,
    description: 'Important, complete soon',
  },
  3: {
    label: 'Medium',
    shortLabel: 'P3',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    sortWeight: 3,
    description: 'Standard priority',
  },
  4: {
    label: 'Low',
    shortLabel: 'P4',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    sortWeight: 4,
    description: 'Nice to have, no rush',
  },
};

export function getPriorityConfig(priority: CoursePriority): PriorityConfig {
  return PRIORITIES[priority] ?? PRIORITIES[3];
}
