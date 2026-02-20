import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AchievementLockedCard } from './achievement-locked-card';
import type { LockedAchievement } from '@/lib/types';

vi.mock('../lib/achievement-icons', () => ({
  ACHIEVEMENT_ICONS: {
    streak_7: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="locked-icon" {...props} />,
  },
}));

vi.mock('./achievement-progress-bar', () => ({
  AchievementProgressBar: ({ current, target }: { current: number; target: number }) => (
    <div data-testid="progress-bar">{current}/{target}</div>
  ),
}));

const lockedAchievement: LockedAchievement = {
  achievement_type: 'streak_7' as any,
  name: 'Week Warrior',
  description: 'Maintain a 7-day study streak',
  category: 'streak',
  progress: 43,
  current: 3,
  target: 7,
};

describe('AchievementLockedCard', () => {
  it('renders achievement name and description', () => {
    render(<AchievementLockedCard achievement={lockedAchievement} />);
    expect(screen.getByText('Week Warrior')).toBeDefined();
    expect(screen.getByText('Maintain a 7-day study streak')).toBeDefined();
  });

  it('renders icon', () => {
    render(<AchievementLockedCard achievement={lockedAchievement} />);
    expect(screen.getByTestId('locked-icon')).toBeDefined();
  });

  it('shows progress bar when target > 1', () => {
    render(<AchievementLockedCard achievement={lockedAchievement} />);
    expect(screen.getByTestId('progress-bar')).toBeDefined();
    expect(screen.getByText('3/7')).toBeDefined();
  });

  it('hides progress bar when target is 1', () => {
    const singleStep = { ...lockedAchievement, target: 1, current: 0 };
    render(<AchievementLockedCard achievement={singleStep} />);
    expect(screen.queryByTestId('progress-bar')).toBeNull();
  });

  it('has reduced opacity styling', () => {
    const { container } = render(<AchievementLockedCard achievement={lockedAchievement} />);
    // The Card root should have opacity-60 class
    const card = container.firstElementChild;
    expect(card?.className).toContain('opacity-60');
  });
});
