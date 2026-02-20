import type { LeaderboardEntry } from '@/lib/types';

/**
 * Rank entries by hours_this_week descending, assigning rank numbers.
 * Ties receive the same rank.
 */
export function rankEntries(
  entries: Omit<LeaderboardEntry, 'rank'>[]
): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => b.hours_this_week - a.hours_this_week);
  let currentRank = 1;
  return sorted.map((entry, i) => {
    if (i > 0 && sorted[i - 1].hours_this_week > entry.hours_this_week) {
      currentRank = i + 1;
    }
    return { ...entry, rank: currentRank };
  });
}

/**
 * Get the start (Monday) and end (Sunday) of the current week.
 * Returns ISO date strings (YYYY-MM-DD).
 */
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

/**
 * Get display badge for a leaderboard rank.
 */
export function getRankBadge(rank: number): { emoji: string; label: string } {
  switch (rank) {
    case 1:
      return { emoji: '🥇', label: '1st' };
    case 2:
      return { emoji: '🥈', label: '2nd' };
    case 3:
      return { emoji: '🥉', label: '3rd' };
    default:
      return { emoji: '', label: `${rank}th` };
  }
}

/**
 * Format week range for display.
 */
export function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
}
