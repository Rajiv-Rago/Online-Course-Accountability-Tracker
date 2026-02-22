import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Achievement, LockedAchievement } from '@/lib/types';

// Mock tanstack react-query
vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn, onSuccess, onError }: any) => ({
    mutate: (args: any) => {
      mockShareMutateFn(args);
    },
    isPending: mockSharePending,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

let mockShareMutateFn = vi.fn();
let mockSharePending = false;

// Mock hooks
const mockAchievementsReturn: {
  data: { earned: Achievement[]; locked: LockedAchievement[] } | undefined;
  isLoading: boolean;
  error: Error | null;
} = {
  data: undefined,
  isLoading: false,
  error: null,
};

vi.mock('../hooks/use-achievements', () => ({
  useAchievements: () => mockAchievementsReturn,
}));

vi.mock('../actions/achievement-actions', () => ({
  shareAchievement: vi.fn(),
}));

vi.mock('../lib/achievement-definitions', () => ({
  ACHIEVEMENT_MAP: new Map([
    ['first_session', { name: 'First Steps', description: 'Log your first session', category: 'milestone', maxProgress: 1 }],
    ['streak_7', { name: 'Week Warrior', description: '7-day streak', category: 'streak', maxProgress: 7 }],
  ]),
}));

// Mock child components
vi.mock('./achievement-card', () => ({
  AchievementCard: ({ achievement, onShareClick }: any) => (
    <div data-testid={`earned-${achievement.id}`}>
      <span>{achievement.achievement_type}</span>
      {onShareClick && (
        <button onClick={() => onShareClick(achievement.id, achievement.shared)}>
          Share
        </button>
      )}
    </div>
  ),
}));

vi.mock('./achievement-locked-card', () => ({
  AchievementLockedCard: ({ achievement }: any) => (
    <div data-testid={`locked-${achievement.achievement_type}`}>{achievement.name}</div>
  ),
}));

vi.mock('./achievement-share-dialog', () => ({
  AchievementShareDialog: ({ open, achievementName, currentlyShared, onConfirm }: any) =>
    open ? (
      <div data-testid="share-dialog">
        <span>{achievementName}</span>
        <span>{currentlyShared ? 'Hide' : 'Share'}</span>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : null,
}));

vi.mock('./empty-achievements', () => ({
  EmptyAchievements: () => <div data-testid="empty-achievements">No achievements earned yet</div>,
}));

import { AchievementGallery } from './achievement-gallery';

const makeEarned = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: 'ach-1',
  user_id: 'user-1',
  achievement_type: 'first_session' as any,
  course_id: null,
  earned_at: '2024-06-15T10:00:00Z',
  shared: false,
  metadata: null,
  ...overrides,
});

const makeLocked = (overrides: Partial<LockedAchievement> = {}): LockedAchievement => ({
  achievement_type: 'streak_7' as any,
  name: 'Week Warrior',
  description: '7-day streak',
  category: 'streak',
  progress: 43,
  current: 3,
  target: 7,
  ...overrides,
});

describe('AchievementGallery', () => {
  beforeEach(() => {
    mockAchievementsReturn.data = undefined;
    mockAchievementsReturn.isLoading = false;
    mockAchievementsReturn.error = null;
    mockShareMutateFn = vi.fn();
    mockSharePending = false;
  });

  it('shows loading skeletons when isLoading is true', () => {
    mockAchievementsReturn.isLoading = true;
    const { container } = render(<AchievementGallery />);
    expect(screen.queryByText('Earned')).toBeNull();
    expect(container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('shows error message when error occurs', () => {
    mockAchievementsReturn.error = new Error('Network error');
    render(<AchievementGallery />);
    expect(screen.getByText('Failed to load achievements: Network error')).toBeDefined();
  });

  it('shows empty achievements when no earned achievements', () => {
    mockAchievementsReturn.data = { earned: [], locked: [] };
    render(<AchievementGallery />);
    expect(screen.getByTestId('empty-achievements')).toBeDefined();
  });

  it('renders earned count in heading', () => {
    mockAchievementsReturn.data = {
      earned: [makeEarned()],
      locked: [],
    };
    render(<AchievementGallery />);
    expect(screen.getByText('Earned (1)')).toBeDefined();
  });

  it('renders earned achievement cards', () => {
    mockAchievementsReturn.data = {
      earned: [makeEarned({ id: 'a1' }), makeEarned({ id: 'a2' })],
      locked: [],
    };
    render(<AchievementGallery />);
    expect(screen.getByTestId('earned-a1')).toBeDefined();
    expect(screen.getByTestId('earned-a2')).toBeDefined();
  });

  it('renders locked achievement cards when there are locked achievements', () => {
    mockAchievementsReturn.data = {
      earned: [makeEarned()],
      locked: [makeLocked()],
    };
    render(<AchievementGallery />);
    expect(screen.getByText('Locked (1)')).toBeDefined();
    expect(screen.getByTestId('locked-streak_7')).toBeDefined();
  });

  it('does not render locked section when there are no locked achievements', () => {
    mockAchievementsReturn.data = { earned: [makeEarned()], locked: [] };
    render(<AchievementGallery />);
    expect(screen.queryByText(/Locked/)).toBeNull();
  });

  it('opens share dialog when share is clicked on an earned achievement', () => {
    mockAchievementsReturn.data = {
      earned: [makeEarned({ id: 'a1', achievement_type: 'first_session' as any })],
      locked: [],
    };
    render(<AchievementGallery />);
    expect(screen.queryByTestId('share-dialog')).toBeNull();

    fireEvent.click(screen.getByText('Share'));
    expect(screen.getByTestId('share-dialog')).toBeDefined();
    expect(screen.getByText('First Steps')).toBeDefined();
  });

  it('shows Share mode when achievement is not shared', () => {
    mockAchievementsReturn.data = {
      earned: [makeEarned({ id: 'a1', shared: false, achievement_type: 'first_session' as any })],
      locked: [],
    };
    render(<AchievementGallery />);
    fireEvent.click(screen.getByText('Share'));
    // The dialog should show "Share" (not "Hide")
    const dialog = screen.getByTestId('share-dialog');
    expect(dialog.textContent).toContain('Share');
  });

  it('shows Hide mode when achievement is shared', () => {
    mockAchievementsReturn.data = {
      earned: [makeEarned({ id: 'a1', shared: true, achievement_type: 'first_session' as any })],
      locked: [],
    };
    render(<AchievementGallery />);
    fireEvent.click(screen.getByText('Share'));
    const dialog = screen.getByTestId('share-dialog');
    expect(dialog.textContent).toContain('Hide');
  });

  it('calls share mutation when confirm is clicked in dialog', () => {
    mockAchievementsReturn.data = {
      earned: [makeEarned({ id: 'a1', shared: false, achievement_type: 'first_session' as any })],
      locked: [],
    };
    render(<AchievementGallery />);
    fireEvent.click(screen.getByText('Share'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(mockShareMutateFn).toHaveBeenCalledWith({ id: 'a1', shared: true });
  });
});
