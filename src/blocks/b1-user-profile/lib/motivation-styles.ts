import type { MotivationStyle } from '@/lib/types/enums';

export interface MotivationStyleInfo {
  value: MotivationStyle;
  label: string;
  description: string;
  exampleQuote: string;
  icon: 'heart' | 'scale' | 'flame';
  recommended: boolean;
}

export const MOTIVATION_STYLES: MotivationStyleInfo[] = [
  {
    value: 'gentle',
    label: 'Gentle',
    description:
      'Encouraging and supportive. Soft reminders, lots of praise.',
    exampleQuote: 'Great job studying today!',
    icon: 'heart',
    recommended: false,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description:
      'Mix of praise and accountability. Celebrates wins, flags concerns.',
    exampleQuote: "Solid progress! But you're 2 days behind.",
    icon: 'scale',
    recommended: true,
  },
  {
    value: 'drill_sergeant',
    label: 'Drill Sergeant',
    description:
      'Direct, no-nonsense style. Firm deadlines, blunt feedback.',
    exampleQuote: 'You missed your session. No excuses. Go.',
    icon: 'flame',
    recommended: false,
  },
];

export function getMotivationStyleInfo(
  value: MotivationStyle
): MotivationStyleInfo {
  const found = MOTIVATION_STYLES.find((s) => s.value === value);
  if (!found) {
    console.warn(`Unknown motivation_style "${value}", falling back to "balanced"`);
    return MOTIVATION_STYLES[1];
  }
  return found;
}
