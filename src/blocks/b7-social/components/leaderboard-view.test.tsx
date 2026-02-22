import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaderboardView } from './leaderboard-view';
import type { LeaderboardEntry } from '@/lib/types';

// Mock sub-components
vi.mock('./leaderboard-header', () => ({
  LeaderboardHeader: () => <div data-testid="leaderboard-header">Weekly Leaderboard</div>,
}));

vi.mock('./leaderboard-table', () => ({
  LeaderboardTable: ({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) => (
    <table data-testid="leaderboard-table">
      <tbody>
        {entries.map((e) => (
          <tr key={e.user_id} data-current={e.user_id === currentUserId}>
            <td>{e.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('./leaderboard-empty', () => ({
  LeaderboardEmpty: () => <div data-testid="leaderboard-empty">No leaderboard data yet</div>,
}));

const mockLeaderboardReturn: { data: LeaderboardEntry[] | undefined; isLoading: boolean; error: Error | null } = {
  data: undefined,
  isLoading: false,
  error: null,
};

vi.mock('../hooks/use-leaderboard', () => ({
  useLeaderboard: () => mockLeaderboardReturn,
}));

const makeEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  user_id: 'user-1',
  name: 'Alice',
  avatar_url: null,
  hours_this_week: 10,
  sessions_this_week: 5,
  streak: 7,
  rank: 1,
  ...overrides,
});

describe('LeaderboardView', () => {
  beforeEach(() => {
    mockLeaderboardReturn.data = undefined;
    mockLeaderboardReturn.isLoading = false;
    mockLeaderboardReturn.error = null;
  });

  it('shows loading skeleton when isLoading is true', () => {
    mockLeaderboardReturn.isLoading = true;
    const { container } = render(<LeaderboardView currentUserId="me" />);
    // Should not show header or table
    expect(screen.queryByTestId('leaderboard-header')).toBeNull();
    expect(screen.queryByTestId('leaderboard-table')).toBeNull();
    // Skeletons should be present (check for skeleton divs)
    expect(container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('shows error message when error occurs', () => {
    mockLeaderboardReturn.error = new Error('Network failure');
    render(<LeaderboardView currentUserId="me" />);
    expect(screen.getByText('Failed to load leaderboard: Network failure')).toBeDefined();
  });

  it('shows empty state when entries has 1 or fewer users', () => {
    mockLeaderboardReturn.data = [makeEntry()];
    render(<LeaderboardView currentUserId="user-1" />);
    expect(screen.getByTestId('leaderboard-empty')).toBeDefined();
    expect(screen.queryByTestId('leaderboard-table')).toBeNull();
  });

  it('shows empty state when entries is empty', () => {
    mockLeaderboardReturn.data = [];
    render(<LeaderboardView currentUserId="me" />);
    expect(screen.getByTestId('leaderboard-empty')).toBeDefined();
  });

  it('renders the table when entries has more than 1 user', () => {
    mockLeaderboardReturn.data = [
      makeEntry({ user_id: 'user-1', name: 'Alice', rank: 1, hours_this_week: 20 }),
      makeEntry({ user_id: 'user-2', name: 'Bob', rank: 2, hours_this_week: 15 }),
    ];
    render(<LeaderboardView currentUserId="user-1" />);
    expect(screen.getByTestId('leaderboard-table')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
  });

  it('renders the leaderboard header', () => {
    mockLeaderboardReturn.data = [
      makeEntry({ user_id: 'u1' }),
      makeEntry({ user_id: 'u2' }),
    ];
    render(<LeaderboardView currentUserId="u1" />);
    expect(screen.getByTestId('leaderboard-header')).toBeDefined();
  });

  it('shows personal stats card when current user is in entries', () => {
    mockLeaderboardReturn.data = [
      makeEntry({ user_id: 'me', hours_this_week: 12, sessions_this_week: 6, streak: 3, rank: 1 }),
      makeEntry({ user_id: 'other', rank: 2, hours_this_week: 8 }),
    ];
    render(<LeaderboardView currentUserId="me" />);
    expect(screen.getByText('Your Stats This Week')).toBeDefined();
    expect(screen.getByText('12h')).toBeDefined();
    expect(screen.getByText('6')).toBeDefined();
    expect(screen.getByText('3d')).toBeDefined();
    expect(screen.getByText('Study Time')).toBeDefined();
    expect(screen.getByText('Sessions')).toBeDefined();
    expect(screen.getByText('Streak')).toBeDefined();
  });

  it('does not show personal stats card when current user is not in entries', () => {
    mockLeaderboardReturn.data = [
      makeEntry({ user_id: 'user-1', rank: 1 }),
      makeEntry({ user_id: 'user-2', rank: 2 }),
    ];
    render(<LeaderboardView currentUserId="not-in-list" />);
    expect(screen.queryByText('Your Stats This Week')).toBeNull();
  });

  it('shows header even when empty state is displayed', () => {
    mockLeaderboardReturn.data = [];
    render(<LeaderboardView currentUserId="me" />);
    expect(screen.getByTestId('leaderboard-header')).toBeDefined();
  });
});
