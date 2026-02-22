import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LeaderboardEntry } from '@/lib/types';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock leaderboard-calculator
vi.mock('../lib/leaderboard-calculator', () => ({
  getCurrentWeekRange: () => ({ start: '2024-06-17', end: '2024-06-23' }),
  formatWeekRange: (start: string, end: string) => 'Jun 17 – Jun 23',
  getRankBadge: (rank: number) => {
    const map: Record<number, { emoji: string; label: string }> = {
      1: { emoji: '\u{1F947}', label: '1st' },
      2: { emoji: '\u{1F948}', label: '2nd' },
      3: { emoji: '\u{1F949}', label: '3rd' },
    };
    return map[rank] || { emoji: '', label: `${rank}th` };
  },
}));

import { LeaderboardHeader } from './leaderboard-header';
import { LeaderboardRow } from './leaderboard-row';
import { LeaderboardTable } from './leaderboard-table';
import { LeaderboardEmpty } from './leaderboard-empty';

const makeEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  user_id: 'user-1',
  name: 'Alice Cooper',
  avatar_url: null,
  hours_this_week: 20,
  sessions_this_week: 10,
  streak: 7,
  rank: 1,
  ...overrides,
});

// ============================================================
// LeaderboardHeader
// ============================================================
describe('LeaderboardHeader', () => {
  it('renders "Weekly Leaderboard" title', () => {
    render(<LeaderboardHeader />);
    expect(screen.getByText('Weekly Leaderboard')).toBeDefined();
  });

  it('renders the formatted week range', () => {
    render(<LeaderboardHeader />);
    expect(screen.getByText('Jun 17 – Jun 23')).toBeDefined();
  });
});

// ============================================================
// LeaderboardRow
// ============================================================
describe('LeaderboardRow', () => {
  // Wrap in a table for valid DOM
  const renderRow = (props: { entry: LeaderboardEntry; isCurrentUser?: boolean }) =>
    render(
      <table>
        <tbody>
          <LeaderboardRow {...props} />
        </tbody>
      </table>
    );

  it('renders the name', () => {
    renderRow({ entry: makeEntry() });
    expect(screen.getByText('Alice Cooper')).toBeDefined();
  });

  it('renders initials in avatar fallback', () => {
    renderRow({ entry: makeEntry() });
    expect(screen.getByText('AC')).toBeDefined();
  });

  it('renders hours, sessions, and streak', () => {
    renderRow({ entry: makeEntry({ hours_this_week: 15, sessions_this_week: 8, streak: 5 }) });
    expect(screen.getByText('15h')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('5d')).toBeDefined();
  });

  it('shows "(you)" label when isCurrentUser is true', () => {
    renderRow({ entry: makeEntry(), isCurrentUser: true });
    expect(screen.getByText('(you)')).toBeDefined();
  });

  it('does not show "(you)" label when isCurrentUser is false', () => {
    renderRow({ entry: makeEntry(), isCurrentUser: false });
    expect(screen.queryByText('(you)')).toBeNull();
  });

  it('shows rank label for rank > 3', () => {
    renderRow({ entry: makeEntry({ rank: 4 }) });
    expect(screen.getByText('4th')).toBeDefined();
  });

  it('applies highlighted style for current user', () => {
    const { container } = renderRow({ entry: makeEntry(), isCurrentUser: true });
    const row = container.querySelector('tr');
    expect(row?.className).toContain('bg-primary/5');
  });

  it('does not apply highlighted style for non-current user', () => {
    const { container } = renderRow({ entry: makeEntry(), isCurrentUser: false });
    const row = container.querySelector('tr');
    expect(row?.className).not.toContain('bg-primary/5');
  });
});

// ============================================================
// LeaderboardTable
// ============================================================
describe('LeaderboardTable', () => {
  it('renders table headers', () => {
    render(<LeaderboardTable entries={[makeEntry()]} currentUserId="user-1" />);
    expect(screen.getByText('Rank')).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Hours')).toBeDefined();
    expect(screen.getByText('Sessions')).toBeDefined();
    expect(screen.getByText('Streak')).toBeDefined();
  });

  it('renders a row for each entry', () => {
    const entries = [
      makeEntry({ user_id: 'u1', name: 'Alice', rank: 1 }),
      makeEntry({ user_id: 'u2', name: 'Bob', rank: 2 }),
      makeEntry({ user_id: 'u3', name: 'Charlie', rank: 3 }),
    ];
    render(<LeaderboardTable entries={entries} currentUserId="u1" />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('Charlie')).toBeDefined();
  });

  it('marks current user row correctly', () => {
    const entries = [makeEntry({ user_id: 'me', name: 'Current User', rank: 1 })];
    render(<LeaderboardTable entries={entries} currentUserId="me" />);
    expect(screen.getByText('(you)')).toBeDefined();
  });
});

// ============================================================
// LeaderboardEmpty
// ============================================================
describe('LeaderboardEmpty', () => {
  it('renders the empty state heading', () => {
    render(<LeaderboardEmpty />);
    expect(screen.getByText('No leaderboard data yet')).toBeDefined();
  });

  it('renders the description', () => {
    render(<LeaderboardEmpty />);
    expect(screen.getByText(/Connect with study buddies/)).toBeDefined();
  });

  it('renders a link to find buddies', () => {
    render(<LeaderboardEmpty />);
    const link = screen.getByText('Find Buddies').closest('a');
    expect(link?.getAttribute('href')).toBe('/social/buddies');
  });
});
