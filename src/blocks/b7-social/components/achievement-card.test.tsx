import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AchievementCard } from './achievement-card';
import type { Achievement } from '@/lib/types';

// Mock the achievement maps
vi.mock('../lib/achievement-definitions', () => ({
  ACHIEVEMENT_MAP: new Map([
    ['first_session', { name: 'First Steps', description: 'Log your first study session', category: 'milestone', maxProgress: 1 }],
  ]),
}));

vi.mock('../lib/achievement-icons', () => ({
  ACHIEVEMENT_ICONS: {
    first_session: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="achievement-icon" {...props} />,
  },
}));

const mockAchievement: Achievement = {
  id: 'ach-1',
  user_id: 'user-1',
  achievement_type: 'first_session' as any,
  course_id: null,
  earned_at: '2024-06-15T10:00:00Z',
  shared: false,
  metadata: null,
};

describe('AchievementCard', () => {
  it('renders achievement name and description', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.getByText('First Steps')).toBeDefined();
    expect(screen.getByText('Log your first study session')).toBeDefined();
  });

  it('renders earned date', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.getByText(/Jun 15, 2024/)).toBeDefined();
  });

  it('renders icon', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.getByTestId('achievement-icon')).toBeDefined();
  });

  it('renders share button when onShareClick provided', () => {
    const onShare = vi.fn();
    render(<AchievementCard achievement={mockAchievement} onShareClick={onShare} />);
    const shareButton = screen.getByTitle('Share with buddies');
    expect(shareButton).toBeDefined();
  });

  it('calls onShareClick when share button clicked', () => {
    const onShare = vi.fn();
    render(<AchievementCard achievement={mockAchievement} onShareClick={onShare} />);
    fireEvent.click(screen.getByTitle('Share with buddies'));
    expect(onShare).toHaveBeenCalledWith('ach-1', false);
  });

  it('does not render share button when onShareClick not provided', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.queryByTitle('Share with buddies')).toBeNull();
    expect(screen.queryByTitle('Shared with buddies')).toBeNull();
  });

  it('shows "Shared with buddies" title when achievement is shared', () => {
    const shared = { ...mockAchievement, shared: true };
    const onShare = vi.fn();
    render(<AchievementCard achievement={shared} onShareClick={onShare} />);
    expect(screen.getByTitle('Shared with buddies')).toBeDefined();
  });
});
